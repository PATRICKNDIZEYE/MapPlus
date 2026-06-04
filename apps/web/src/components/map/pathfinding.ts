/**
 * Frontend-only indoor pathfinding for the shopper map.
 *
 * We don't have a routing graph in the database yet — instead we
 * rasterise the floor into a navigation grid and run A* over it. The
 * resulting polyline goes through actual corridors (the "negative
 * space" between unit polygons), not across shop walls.
 *
 *   1. Build a grid covering the floor's bbox at ~1.5m resolution.
 *   2. Every cell whose centre falls inside a unit polygon (any shop —
 *      occupied, vacant, reserved, maintenance) is marked BLOCKED.
 *   3. Optional 1-cell dilation around blocked cells prevents the
 *      smoothed path from clipping wall corners diagonally.
 *   4. Snap start + end to the nearest walkable cells (handles cases
 *      where the entrance sits on a wall corner, or the destination is
 *      the centroid of a shop polygon — the BFS spiral finds the
 *      nearest doorway-side cell).
 *   5. Run A* with an octile heuristic over 8-connected neighbours.
 *   6. Smooth the resulting cell path with iterative line-of-sight
 *      culling so the polyline doesn't zig-zag along every grid cell.
 *   7. Project the smoothed cell path back to lng/lat.
 *
 * Performance: a ~240m × 130m mall at 1.5m cells is ~22,000 cells. A*
 * usually expands a few thousand nodes — completes in <50ms on a
 * desktop. We memoise the grid by floorGeoJSON identity in the parent
 * component, so the work happens once per floor change.
 */

import type { FloorMapGeoJSON } from '@mallguide/shared';

type Pt = [number, number];

export interface NavGrid {
  cells:   Uint8Array; // 1 = walkable, 0 = blocked
  cols:    number;
  rows:    number;
  minLng:  number;
  minLat:  number;
  cellLng: number;     // degrees lng per cell
  cellLat: number;     // degrees lat per cell
}

const CELL_METRES = 1.5;

/**
 * The synthetic "central vertical communication" point — stands in for
 * the building's main escalator/elevator core. It's the bbox centre of
 * the unit polygons, which lines up with the atrium in CHIC's layout
 * and is consistent across every floor (vertical alignment).
 */
export function centralVerticalPoint(geo: FloorMapGeoJSON): [number, number] | null {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geo.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const [lng, lat] of f.geometry.coordinates[0] as [number, number][]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return null;
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

export function buildNavGrid(geo: FloorMapGeoJSON): NavGrid | null {
  if (!geo.units?.features?.length) return null;

  // 1) bbox of all units
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geo.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const [lng, lat] of f.geometry.coordinates[0] as Pt[]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return null;

  // 2) cell sizes in degrees (planar conversion at midLat)
  const midLat     = (minLat + maxLat) / 2;
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos((midLat * Math.PI) / 180);
  const cellLat    = CELL_METRES / mPerDegLat;
  const cellLng    = CELL_METRES / mPerDegLng;

  // Pad the bbox by 2 cells in each direction so entrances on the
  // building perimeter still have walkable cells around them.
  const padLng = cellLng * 2;
  const padLat = cellLat * 2;
  minLng -= padLng; maxLng += padLng;
  minLat -= padLat; maxLat += padLat;

  const cols = Math.max(1, Math.ceil((maxLng - minLng) / cellLng));
  const rows = Math.max(1, Math.ceil((maxLat - minLat) / cellLat));
  const cells = new Uint8Array(cols * rows).fill(1); // start walkable

  // 3) block cells whose centre is inside any unit polygon
  for (const f of geo.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    const ring = f.geometry.coordinates[0] as Pt[];

    // polygon bbox to bound the cell scan
    let pMinLng = Infinity, pMaxLng = -Infinity, pMinLat = Infinity, pMaxLat = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < pMinLng) pMinLng = lng;
      if (lng > pMaxLng) pMaxLng = lng;
      if (lat < pMinLat) pMinLat = lat;
      if (lat > pMaxLat) pMaxLat = lat;
    }
    const c0 = Math.max(0,        Math.floor((pMinLng - minLng) / cellLng));
    const c1 = Math.min(cols - 1, Math.ceil((pMaxLng - minLng) / cellLng));
    const r0 = Math.max(0,        Math.floor((pMinLat - minLat) / cellLat));
    const r1 = Math.min(rows - 1, Math.ceil((pMaxLat - minLat) / cellLat));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (cells[r * cols + c] === 0) continue;
        const cx = minLng + (c + 0.5) * cellLng;
        const cy = minLat + (r + 0.5) * cellLat;
        if (pointInPolygon([cx, cy], ring)) cells[r * cols + c] = 0;
      }
    }
  }

  // 4) dilate blocked cells by 1 to keep smoothed paths off the walls
  dilateBlocked(cells, cols, rows);

  return { cells, cols, rows, minLng, minLat, cellLng, cellLat };
}

/**
 * Compute a walkable polyline from `start` to `end` over `grid`.
 * Returns null when no path exists (e.g. start or end is fully boxed in).
 */
export function findPath(start: Pt, end: Pt, grid: NavGrid): Pt[] | null {
  const s = nearestWalkable(...ptToCell(start, grid), grid);
  const e = nearestWalkable(...ptToCell(end,   grid), grid);
  if (!s || !e) return null;
  const [sc, sr] = s;
  const [ec, er] = e;
  if (sc === ec && sr === er) return [cellToPt(sc, sr, grid)];

  const N = grid.cols * grid.rows;
  const gScore = new Float32Array(N).fill(Infinity);
  const cameFrom = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);

  const sk = sr * grid.cols + sc;
  const ek = er * grid.cols + ec;
  gScore[sk] = 0;

  const heap = new MinHeap<{ f: number; k: number }>((a, b) => a.f - b.f);
  heap.push({ f: octile(sc, sr, ec, er), k: sk });

  const DIRS: Array<[number, number, number]> = [
    [ 1,  0, 1], [-1,  0, 1], [ 0,  1, 1], [ 0, -1, 1],
    [ 1,  1, Math.SQRT2], [ 1, -1, Math.SQRT2],
    [-1,  1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (heap.size > 0) {
    const cur = heap.pop()!;
    if (closed[cur.k]) continue;
    closed[cur.k] = 1;
    if (cur.k === ek) {
      // Reconstruct + smooth
      const cellPath = reconstruct(cameFrom, cur.k, grid.cols);
      const smoothed = lineOfSightSmooth(cellPath, grid);
      return smoothed.map(([c, r]) => cellToPt(c, r, grid));
    }

    const cc = cur.k % grid.cols;
    const cr = (cur.k - cc) / grid.cols;

    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
      const nk = nr * grid.cols + nc;
      if (grid.cells[nk] === 0 || closed[nk]) continue;
      // Disallow diagonal moves that "squeeze" through a wall corner.
      if (dc !== 0 && dr !== 0) {
        const k1 = cr * grid.cols + nc;
        const k2 = nr * grid.cols + cc;
        if (grid.cells[k1] === 0 || grid.cells[k2] === 0) continue;
      }
      const tentative = gScore[cur.k]! + cost;
      if (tentative < gScore[nk]!) {
        gScore[nk] = tentative;
        cameFrom[nk] = cur.k;
        heap.push({ f: tentative + octile(nc, nr, ec, er), k: nk });
      }
    }
  }
  return null;
}

// ── helpers ─────────────────────────────────────────────────────────────

function ptToCell(p: Pt, g: NavGrid): [number, number] {
  return [
    Math.floor((p[0] - g.minLng) / g.cellLng),
    Math.floor((p[1] - g.minLat) / g.cellLat),
  ];
}

function cellToPt(c: number, r: number, g: NavGrid): Pt {
  return [g.minLng + (c + 0.5) * g.cellLng, g.minLat + (r + 0.5) * g.cellLat];
}

function octile(c1: number, r1: number, c2: number, r2: number): number {
  const dc = Math.abs(c1 - c2);
  const dr = Math.abs(r1 - r2);
  return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
}

/**
 * Spiral outward from (c, r) to find the closest walkable cell.
 * Bounded by the largest possible radius.
 */
function nearestWalkable(c: number, r: number, g: NavGrid): [number, number] | null {
  if (c >= 0 && c < g.cols && r >= 0 && r < g.rows && g.cells[r * g.cols + c] === 1) {
    return [c, r];
  }
  const maxR = Math.max(g.cols, g.rows);
  for (let radius = 1; radius < maxR; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nc >= g.cols || nr < 0 || nr >= g.rows) continue;
        if (g.cells[nr * g.cols + nc] === 1) return [nc, nr];
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Int32Array, end: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let k = end;
  while (k >= 0) {
    const c = k % cols;
    const r = (k - c) / cols;
    out.push([c, r]);
    k = cameFrom[k]!;
    if (k < 0 || k > cameFrom.length) break;
  }
  out.reverse();
  return out;
}

/**
 * Iteratively drop intermediate cells when there's a clear straight
 * line from the last kept cell to the next-next one. Produces clean
 * polylines that follow corridors with one segment per straight run.
 */
function lineOfSightSmooth(path: Array<[number, number]>, g: NavGrid): Array<[number, number]> {
  if (path.length <= 2) return path;
  const out: Array<[number, number]> = [path[0]!];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    if (!losClear(path[anchor]!, path[i]!, g)) {
      out.push(path[i - 1]!);
      anchor = i - 1;
    }
  }
  out.push(path[path.length - 1]!);
  return out;
}

/** Bresenham traversal that returns false the moment it hits a blocked cell. */
function losClear(a: [number, number], b: [number, number], g: NavGrid): boolean {
  let c = a[0], r = a[1];
  const dc = Math.abs(b[0] - a[0]);
  const dr = Math.abs(b[1] - a[1]);
  const sc = a[0] < b[0] ? 1 : -1;
  const sr = a[1] < b[1] ? 1 : -1;
  let err = dc - dr;

  while (c !== b[0] || r !== b[1]) {
    if (g.cells[r * g.cols + c] === 0) return false;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc)  { err += dc; r += sr; }
  }
  return true;
}

function pointInPolygon(p: Pt, polygon: Pt[]): boolean {
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]![0]!, yi = polygon[i]![1]!;
    const xj = polygon[j]![0]!, yj = polygon[j]![1]!;
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Inflate the blocked region by one cell so smoothed line-of-sight
 * paths don't kiss the walls (which looks like the user is walking
 * through them).
 */
function dilateBlocked(cells: Uint8Array, cols: number, rows: number): void {
  const original = cells.slice();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (original[r * cols + c] !== 0) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          cells[nr * cols + nc] = 0;
        }
      }
    }
  }
}

// ── tiny binary heap ────────────────────────────────────────────────────

class MinHeap<T> {
  private items: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  get size(): number { return this.items.length; }
  push(x: T): void {
    this.items.push(x);
    this.up(this.items.length - 1);
  }
  pop(): T | undefined {
    const n = this.items.length;
    if (n === 0) return undefined;
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (n > 1) {
      this.items[0] = last;
      this.down(0);
    }
    return top;
  }
  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.items[i]!, this.items[p]!) < 0) {
        [this.items[i], this.items[p]] = [this.items[p]!, this.items[i]!];
        i = p;
      } else break;
    }
  }
  private down(i: number): void {
    const n = this.items.length;
    for (;;) {
      const l = i * 2 + 1, r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.cmp(this.items[l]!, this.items[smallest]!) < 0) smallest = l;
      if (r < n && this.cmp(this.items[r]!, this.items[smallest]!) < 0) smallest = r;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest]!, this.items[i]!];
      i = smallest;
    }
  }
}
