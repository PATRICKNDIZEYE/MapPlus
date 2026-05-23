'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import type { FloorMapGeoJSON, UnitFeatureProperties } from '@mallguide/shared';

export type ViewMode = 'status' | 'category';

type GeoPoint = [number, number];
type ScreenPoint = [number, number];
type PolygonGeometry = { type: 'Polygon'; coordinates: GeoPoint[][] };

interface LoopData {
  path: string;
  area: number;
}

interface Projection {
  project: (point: GeoPoint) => ScreenPoint;
  width: number;
  height: number;
}

const STATUS: Record<string, { fill: string; stroke: string; label: string }> = {
  occupied: { fill: '#4ade80', stroke: '#166534', label: 'Occupied' },
  vacant: { fill: '#e2e8f0', stroke: '#64748b', label: 'Vacant' },
  reserved: { fill: '#fbbf24', stroke: '#b45309', label: 'Reserved' },
  maintenance: { fill: '#f87171', stroke: '#b91c1c', label: 'Maintenance' },
};

const STATUS_DEFAULT = { fill: '#cbd5e1', stroke: '#64748b' };

// 5 category groups → 5 colors. Each individual category maps to a group.
const CATEGORY_GROUP: Record<string, { key: string; label: string; fill: string; stroke: string }> = {
  retail:   { key: 'retail',   label: 'Retail',           fill: '#f472b6', stroke: '#9d174d' },
  food:     { key: 'food',     label: 'Food & Beverage',  fill: '#34d399', stroke: '#065f46' },
  services: { key: 'services', label: 'Tech & Banking',   fill: '#60a5fa', stroke: '#1d4ed8' },
  wellness: { key: 'wellness', label: 'Health & Sport',   fill: '#2dd4bf', stroke: '#115e59' },
  leisure:  { key: 'leisure',  label: 'Leisure',          fill: '#fbbf24', stroke: '#92400e' },
};

const CATEGORY_TO_GROUP: Record<string, keyof typeof CATEGORY_GROUP> = {
  'Fashion & Apparel':  'retail',
  'Beauty & Cosmetics': 'retail',
  'Food & Beverages':   'food',
  'Electronics':        'services',
  'Banking & Finance':  'services',
  'Health & Pharmacy':  'wellness',
  'Sports & Fitness':   'wellness',
  'Entertainment':      'leisure',
};

const CATEGORY_DEFAULT = { fill: '#cbd5e1', stroke: '#64748b' };

function resolveCategoryColors(category: string | null) {
  if (!category) return CATEGORY_DEFAULT;
  const group = CATEGORY_TO_GROUP[category];
  if (!group) return CATEGORY_DEFAULT;
  return CATEGORY_GROUP[group];
}

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 760;
const PAD = 52;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4.5;

function toPointKey([lng, lat]: GeoPoint) {
  return `${lng.toFixed(9)},${lat.toFixed(9)}`;
}

function equalPoint(a: GeoPoint, b: GeoPoint) {
  return a[0] === b[0] && a[1] === b[1];
}

function stripClosedLoop<T extends GeoPoint | ScreenPoint>(points: T[]): T[] {
  if (points.length < 2) return points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) {
    return points.slice(0, -1);
  }
  return points;
}

function signedArea(points: ScreenPoint[]) {
  const ring = stripClosedLoop(points);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function polygonCentroid(points: ScreenPoint[]): ScreenPoint {
  const ring = stripClosedLoop(points);
  let cx = 0;
  let cy = 0;
  let areaFactor = 0;

  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    const factor = x1 * y2 - x2 * y1;
    areaFactor += factor;
    cx += (x1 + x2) * factor;
    cy += (y1 + y2) * factor;
  }

  if (Math.abs(areaFactor) < 1e-6) {
    return [
      ring.reduce((sum, [x]) => sum + x, 0) / ring.length,
      ring.reduce((sum, [, y]) => sum + y, 0) / ring.length,
    ];
  }

  return [cx / (3 * areaFactor), cy / (3 * areaFactor)];
}

function createProjection(points: GeoPoint[]): Projection {
  if (!points.length) {
    return {
      project: () => [SVG_WIDTH / 2, SVG_HEIGHT / 2],
      width: SVG_WIDTH,
      height: SVG_HEIGHT,
    };
  }

  const avgLat =
    points.reduce((sum, [, lat]) => sum + lat, 0) / points.length;
  const cosLat = Math.cos((avgLat * Math.PI) / 180);

  const projected = points.map(([lng, lat]) => [lng * cosLat, lat] as ScreenPoint);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const padX = Math.max((maxX - minX) * 0.1, 0.00002);
  const padY = Math.max((maxY - minY) * 0.1, 0.00002);

  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const innerWidth = SVG_WIDTH - PAD * 2;
  const innerHeight = SVG_HEIGHT - PAD * 2;
  const scale = Math.min(
    innerWidth / Math.max(maxX - minX, 0.000001),
    innerHeight / Math.max(maxY - minY, 0.000001),
  );
  const contentWidth = (maxX - minX) * scale;
  const contentHeight = (maxY - minY) * scale;
  const offsetX = PAD + (innerWidth - contentWidth) / 2;
  const offsetY = PAD + (innerHeight - contentHeight) / 2;

  return {
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    project: ([lng, lat]) => {
      const x = lng * cosLat;
      const y = lat;
      return [
        offsetX + (x - minX) * scale,
        offsetY + (maxY - y) * scale,
      ];
    },
  };
}

function ringPath(points: ScreenPoint[]) {
  const ring = stripClosedLoop(points);
  if (!ring.length) return '';
  return `M ${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} Z`;
}

function polygonPath(rings: GeoPoint[][], projection: Projection) {
  return rings
    .map((ring) => ringPath(ring.map(projection.project)))
    .join(' ');
}

function collectExteriorLoops(features: FloorMapGeoJSON['units']['features']): GeoPoint[][] {
  const edgeCounts = new Map<string, number>();
  const edgePoints = new Map<string, [GeoPoint, GeoPoint]>();

  for (const feature of features) {
    if (feature.geometry?.type !== 'Polygon') continue;
    const ring = feature.geometry.coordinates[0] as GeoPoint[];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i]!;
      const b = ring[i + 1]!;
      const aKey = toPointKey(a);
      const bKey = toPointKey(b);
      const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      edgePoints.set(key, [a, b]);
    }
  }

  const edges = [...edgeCounts.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => {
      const [a, b] = edgePoints.get(key)!;
      return { a, b, used: false };
    });

  const adjacency = new Map<string, number[]>();

  edges.forEach((edge, index) => {
    const aKey = toPointKey(edge.a);
    const bKey = toPointKey(edge.b);
    adjacency.set(aKey, [...(adjacency.get(aKey) ?? []), index]);
    adjacency.set(bKey, [...(adjacency.get(bKey) ?? []), index]);
  });

  const loops: GeoPoint[][] = [];

  edges.forEach((edge, startIndex) => {
    if (edge.used) return;
    edge.used = true;

    const loop: GeoPoint[] = [edge.a, edge.b];
    const startKey = toPointKey(edge.a);
    let currentKey = toPointKey(edge.b);

    while (currentKey !== startKey) {
      const nextIndex = (adjacency.get(currentKey) ?? []).find((index) => !edges[index]!.used);
      if (nextIndex == null) break;

      const nextEdge = edges[nextIndex]!;
      nextEdge.used = true;

      const nextPoint = toPointKey(nextEdge.a) === currentKey ? nextEdge.b : nextEdge.a;
      loop.push(nextPoint);
      currentKey = toPointKey(nextPoint);

      if (loop.length > edges.length + 2) break;
    }

    if (!equalPoint(loop[0]!, loop[loop.length - 1]!)) {
      loop.push(loop[0]!);
    }

    if (loop.length >= 4) {
      loops.push(loop);
    } else {
      edges[startIndex]!.used = true;
    }
  });

  return loops;
}

function buildShell(loops: GeoPoint[][], projection: Projection) {
  const rendered = loops
    .map((loop) => {
      const projected = loop.map(projection.project);
      return {
        path: ringPath(projected),
        area: Math.abs(signedArea(projected)),
      };
    })
    .filter((loop) => loop.area > 10)
    .sort((a, b) => b.area - a.area);

  return {
    outer: rendered[0] ?? null,
    holes: rendered.slice(1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface Props {
  floorGeoJSON: FloorMapGeoJSON;
  viewMode: ViewMode;
  selectedUnitId: string | null;
  onUnitClick: (props: UnitFeatureProperties) => void;
  className?: string;
  /** When set, only units whose shopName / unitCode / category contains this string are highlighted. */
  searchQuery?: string;
  /** When set, only units with these statuses are highlighted (others dim). */
  statusFilter?: ReadonlyArray<string>;
}

export function FloorPlanViewer({
  floorGeoJSON,
  viewMode,
  selectedUnitId,
  onUnitClick,
  className,
  searchQuery,
  statusFilter,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // We treat a pointer interaction as a *click* by default, and only
  // upgrade it to a *drag* once the cursor has moved past DRAG_THRESHOLD px.
  // This prevents trackpad jitter (1–2 px) from stealing every click.
  const dragRef = useRef<{
    pointerId: number;
    startX: number; startY: number;   // initial position
    lastX:  number; lastY:  number;   // previous frame
    isDragging: boolean;
  } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const DRAG_THRESHOLD = 5;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });

  // Parking is rendered around the building on the ground floor only.
  // Derive a lat/lng bbox of the building, then extrude a parking strip
  // north and south of it.
  const parkingZones = useMemo<GeoPoint[][] | null>(() => {
    if (floorGeoJSON.floorNumber !== 0) return null;

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const feature of floorGeoJSON.units.features) {
      if (feature.geometry?.type !== 'Polygon') continue;
      for (const [lng, lat] of feature.geometry.coordinates[0] as GeoPoint[]) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    if (!Number.isFinite(minLng)) return null;

    // Pad parking strip ~35% of building height; pull endpoints in 4% so the
    // strip doesn't touch the building's east/west walls.
    const dLat = (maxLat - minLat) * 0.32;
    const inset = (maxLng - minLng) * 0.04;
    const gap = (maxLat - minLat) * 0.04;
    const w = minLng + inset;
    const e = maxLng - inset;

    const south: GeoPoint[] = [
      [w, minLat - gap - dLat],
      [e, minLat - gap - dLat],
      [e, minLat - gap],
      [w, minLat - gap],
      [w, minLat - gap - dLat],
    ];
    const north: GeoPoint[] = [
      [w, maxLat + gap],
      [e, maxLat + gap],
      [e, maxLat + gap + dLat],
      [w, maxLat + gap + dLat],
      [w, maxLat + gap],
    ];
    return [south, north];
  }, [floorGeoJSON]);

  const extentPoints = useMemo(() => {
    const points: GeoPoint[] = [];

    floorGeoJSON.units.features.forEach((feature) => {
      if (feature.geometry?.type !== 'Polygon') return;
      feature.geometry.coordinates.forEach((ring) => {
        (ring as GeoPoint[]).forEach((point) => points.push(point));
      });
    });

    floorGeoJSON.amenities.features.forEach((feature) => {
      if (feature.geometry?.type === 'Point') {
        points.push(feature.geometry.coordinates as GeoPoint);
      }
    });

    if (parkingZones) {
      for (const ring of parkingZones) {
        for (const point of ring) points.push(point);
      }
    }

    return points;
  }, [floorGeoJSON, parkingZones]);

  const projection = useMemo(() => createProjection(extentPoints), [extentPoints]);

  const shell = useMemo(() => {
    const loops = collectExteriorLoops(floorGeoJSON.units.features);
    return buildShell(loops, projection);
  }, [floorGeoJSON.units.features, projection]);

  const units = useMemo(() => {
    return floorGeoJSON.units.features
      .filter((feature) => feature.geometry?.type === 'Polygon')
      .map((feature) => {
        const properties = feature.properties as UnitFeatureProperties;
        const geometry = feature.geometry as PolygonGeometry;
        const path = polygonPath(geometry.coordinates, projection);
        const primaryRing = geometry.coordinates[0]!;
        const projectedRing = primaryRing.map(projection.project);
        const area = Math.abs(signedArea(projectedRing));
        const center = polygonCentroid(projectedRing);
        const colors =
          viewMode === 'status'
            ? STATUS[properties.status] ?? STATUS_DEFAULT
            : properties.category
              ? resolveCategoryColors(properties.category)
              : STATUS[properties.status] ?? STATUS_DEFAULT;

        return {
          properties,
          path,
          area,
          center,
          colors,
          selected: properties.id === selectedUnitId,
          hovered: properties.id === hoveredId,
        };
      });
  }, [floorGeoJSON.units.features, hoveredId, projection, selectedUnitId, viewMode]);

  const matchingIds = useMemo<Set<string> | null>(() => {
    const q = searchQuery?.trim().toLowerCase() ?? '';
    const hasSearch = q.length > 0;
    const hasFilter = !!statusFilter && statusFilter.length > 0;
    if (!hasSearch && !hasFilter) return null;

    const matches = new Set<string>();
    for (const feature of floorGeoJSON.units.features) {
      const props = feature.properties as UnitFeatureProperties | undefined;
      if (!props) continue;
      if (hasFilter && !statusFilter!.includes(props.status)) continue;
      if (hasSearch) {
        const hay = [props.shopName, props.unitCode, props.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }
      matches.add(props.id);
    }
    return matches;
  }, [searchQuery, statusFilter, floorGeoJSON.units.features]);

  useEffect(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 });
    setHoveredId(null);
  }, [floorGeoJSON.floorId]);

  useEffect(() => {
    if (!selectedUnitId) return;
    const selected = units.find((unit) => unit.properties.id === selectedUnitId);
    if (!selected) return;

    const targetScale = Math.max(transform.scale, 1.4);
    const [cx, cy] = selected.center;
    setTransform((current) => ({
      scale: targetScale,
      tx: current.tx + projection.width / 2 - (cx * targetScale + current.tx),
      ty: current.ty + projection.height / 2 - (cy * targetScale + current.ty),
    }));
  }, [projection.height, projection.width, selectedUnitId, units]);

  // Auto-fit viewport to matching units when search/filter is active.
  useEffect(() => {
    if (!matchingIds || matchingIds.size === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const unit of units) {
      if (!matchingIds.has(unit.properties.id)) continue;
      const [cx, cy] = unit.center;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }
    if (!Number.isFinite(minX)) return;

    const padX = Math.max((maxX - minX) * 0.3, 60);
    const padY = Math.max((maxY - minY) * 0.3, 60);
    const bboxW = (maxX - minX) + padX * 2;
    const bboxH = (maxY - minY) + padY * 2;
    const targetScale = clamp(
      Math.min(projection.width / bboxW, projection.height / bboxH),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setTransform({
      scale: targetScale,
      tx: projection.width / 2 - centerX * targetScale,
      ty: projection.height / 2 - centerY * targetScale,
    });
  }, [matchingIds, projection.height, projection.width, units]);

  function zoomAt(clientX: number, clientY: number, nextScale: number) {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = (svg as unknown as {
      getBoundingClientRect: () => { left: number; top: number };
    }).getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    setTransform((current) => {
      const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
      const tx = sx - ((sx - current.tx) / current.scale) * scale;
      const ty = sy - ((sy - current.ty) / current.scale) * scale;
      return { scale, tx, ty };
    });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    zoomAt(event.clientX, event.clientY, transform.scale * delta);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      lastX:  event.clientX, lastY:  event.clientY,
      isDragging: false,
    };
    // Don't capture immediately — let the polygon's onClick fire normally for
    // a tap. We only call setPointerCapture once we've crossed the threshold.
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const totalDx = event.clientX - drag.startX;
    const totalDy = event.clientY - drag.startY;
    const distance = Math.hypot(totalDx, totalDy);

    // Below the threshold this is still potentially a click — do nothing.
    if (!drag.isDragging && distance < DRAG_THRESHOLD) return;

    // Crossed the threshold: officially a drag from now on.
    if (!drag.isDragging) {
      drag.isDragging = true;
      try {
        (event.currentTarget as unknown as {
          setPointerCapture: (pointerId: number) => void;
        }).setPointerCapture(event.pointerId);
      } catch { /* element may already have the capture */ }
    }

    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    suppressClickUntilRef.current = Date.now() + 200;

    setTransform((current) => ({
      ...current,
      tx: current.tx + dx,
      ty: current.ty + dy,
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      dragRef.current = null;
      if (drag.isDragging) {
        try {
          (event.currentTarget as unknown as {
            releasePointerCapture: (pointerId: number) => void;
          }).releasePointerCapture(event.pointerId);
        } catch { /* ignore */ }
      }
    }
  }

  function handleResetView() {
    setTransform({ scale: 1, tx: 0, ty: 0 });
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-[#111827] ${className ?? ''}`}
    >
      <div className="absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
          {floorGeoJSON.floorName}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Drag to pan. Scroll to zoom.
        </p>
      </div>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/75 p-1 backdrop-blur">
        <button
          type="button"
          onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale / 1.14, MIN_ZOOM, MAX_ZOOM) }))}
          className="h-8 w-8 rounded-md text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
        >
          -
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="rounded-md px-2.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale * 1.14, MIN_ZOOM, MAX_ZOOM) }))}
          className="h-8 w-8 rounded-md text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
        >
          +
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${projection.width} ${projection.height}`}
        className="h-full w-full touch-none"
        onDoubleClick={handleResetView}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <filter id="plan-shell-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#020617" floodOpacity="0.32" />
          </filter>
          <filter id="unit-selected-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#0f172a" floodOpacity="0.28" />
          </filter>
          <pattern
            id="unit-vacant-hatch"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1" opacity="0.38" />
          </pattern>
          <pattern
            id="parking-bays"
            x="0"
            y="0"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <rect width="14" height="14" fill="#374151" />
            <line x1="7" y1="0" x2="7" y2="14" stroke="#fbbf24" strokeWidth="1.2" opacity="0.55" />
          </pattern>
        </defs>

        <rect width={projection.width} height={projection.height} fill="#111827" />

        <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}>
          {parkingZones && parkingZones.map((ring, index) => {
            const projected = ring.map(projection.project);
            const [cx, cy] = polygonCentroid(projected);
            return (
              <g key={`parking-${index}`}>
                <path
                  d={ringPath(projected)}
                  fill="url(#parking-bays)"
                  stroke="#1f2937"
                  strokeWidth={1.4 / transform.scale}
                  opacity={0.92}
                />
                <text
                  x={cx}
                  y={cy + 4 / transform.scale}
                  textAnchor="middle"
                  fontSize={(14 / transform.scale).toFixed(2)}
                  fontWeight="800"
                  letterSpacing="0.18em"
                  fontFamily="var(--font-jakarta), system-ui, sans-serif"
                  fill="#fde68a"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  PARKING
                </text>
              </g>
            );
          })}

          {shell.outer && (
            <path
              d={shell.outer.path}
              fill="#ffffff"
              stroke="#334155"
              strokeWidth={3}
              filter="url(#plan-shell-shadow)"
            />
          )}

          {shell.holes.map((hole, index) => (
            <path
              key={`hole-${index}`}
              d={hole.path}
              fill="#e5ebf3"
              stroke="#94a3b8"
              strokeWidth={1.4}
              strokeDasharray={hole.area > 18000 ? '8 5' : undefined}
            />
          ))}

          {(() => {
            const zoomSq = transform.scale * transform.scale;
            const nameThreshold = 1800 / zoomSq;
            const codeThreshold = 380 / zoomSq;
            const labelFontSize = (12 / transform.scale).toFixed(2);
            const codeFontSize = (8.5 / transform.scale).toFixed(2);
            const strokeBase = 1.6 / transform.scale;
            const strokeHover = 2.2 / transform.scale;
            const strokeSelected = 3 / transform.scale;
            const labelYOffset = 8 / transform.scale;
            const codeYOffsetWithName = 11 / transform.scale;
            const codeYOffsetSolo = 4 / transform.scale;

            return units.map((unit) => {
              const isMatch = !matchingIds || matchingIds.has(unit.properties.id);
              const dim = matchingIds != null && !isMatch;
              const baseOpacity = unit.selected ? 1 : unit.hovered ? 0.96 : 0.88;
              const fillOpacity = dim ? 0.14 : baseOpacity;
              const strokeWidth = unit.selected ? strokeSelected : unit.hovered ? strokeHover : strokeBase;

              return (
                <g
                  key={unit.properties.id}
                  onMouseEnter={() => setHoveredId(unit.properties.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (Date.now() < suppressClickUntilRef.current) return;
                    onUnitClick(unit.properties);
                  }}
                  style={{ cursor: 'pointer', opacity: dim ? 0.55 : 1 }}
                >
                  {unit.properties.status === 'vacant' && (
                    <path d={unit.path} fill="url(#unit-vacant-hatch)" opacity={dim ? 0.25 : 0.8} />
                  )}
                  <path
                    d={unit.path}
                    fill={unit.properties.status === 'vacant' ? 'rgba(226,232,240,0.55)' : unit.colors.fill}
                    fillOpacity={fillOpacity}
                    stroke={unit.colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    filter={unit.selected ? 'url(#unit-selected-shadow)' : undefined}
                  />
                  {unit.selected && (
                    <path
                      d={unit.path}
                      fill="none"
                      stroke={unit.colors.stroke}
                      strokeOpacity={0.2}
                      strokeWidth={7 / transform.scale}
                      strokeLinejoin="round"
                    />
                  )}
                  {!dim && unit.properties.logoUrl && unit.area > nameThreshold * 0.8 && (() => {
                    // Logo sized to ~35% of sqrt(area), clipped to a circle, above the name label.
                    const logoSize = Math.min(Math.sqrt(unit.area) * 0.42, 28) / transform.scale;
                    const logoY = unit.center[1] - labelYOffset - logoSize - 2 / transform.scale;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <clipPath id={`logo-clip-${unit.properties.id}`}>
                          <circle
                            cx={unit.center[0]}
                            cy={logoY + logoSize / 2}
                            r={logoSize / 2}
                          />
                        </clipPath>
                        <circle
                          cx={unit.center[0]}
                          cy={logoY + logoSize / 2}
                          r={logoSize / 2 + 1 / transform.scale}
                          fill="#ffffff"
                          stroke={unit.colors.stroke}
                          strokeWidth={1 / transform.scale}
                        />
                        <image
                          href={unit.properties.logoUrl}
                          x={unit.center[0] - logoSize / 2}
                          y={logoY}
                          width={logoSize}
                          height={logoSize}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#logo-clip-${unit.properties.id})`}
                        />
                      </g>
                    );
                  })()}
                  {!dim && unit.area > nameThreshold && unit.properties.shopName && (
                    <text
                      x={unit.center[0]}
                      y={unit.center[1] - labelYOffset}
                      textAnchor="middle"
                      fontSize={labelFontSize}
                      fontWeight="700"
                      fontFamily="var(--font-jakarta), system-ui, sans-serif"
                      fill={unit.colors.stroke}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {unit.properties.shopName.length > 18
                        ? `${unit.properties.shopName.slice(0, 17)}...`
                        : unit.properties.shopName}
                    </text>
                  )}
                  {!dim && unit.area > codeThreshold && (
                    <text
                      x={unit.center[0]}
                      y={
                        unit.properties.shopName && unit.area > nameThreshold
                          ? unit.center[1] + codeYOffsetWithName
                          : unit.center[1] + codeYOffsetSolo
                      }
                      textAnchor="middle"
                      fontSize={codeFontSize}
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                      fill={unit.colors.stroke}
                      fillOpacity={0.78}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {unit.properties.unitCode}
                    </text>
                  )}
                </g>
              );
            });
          })()}

          {floorGeoJSON.amenities.features
            .filter((feature) => feature.geometry?.type === 'Point')
            .map((feature, index) => {
                  const [x, y] = projection.project(feature.geometry.coordinates as GeoPoint);
                  const featureId =
                    (feature.properties as { id?: string } | undefined)?.id ?? `${index}`;
                  return (
                <g key={featureId} transform={`translate(${x} ${y})`}>
                  <circle r="7" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2.5" />
                  <circle r="2" fill="#ffffff" />
                </g>
              );
            })}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {matchingIds
            ? `${matchingIds.size} of ${floorGeoJSON.units.features.length} units match`
            : `${floorGeoJSON.units.features.length} units rendered`}
        </span>
        <span>{Math.round(transform.scale * 100)}% zoom</span>
      </div>
    </div>
  );
}

export function FloorPlanLegend({ viewMode }: { viewMode: ViewMode }) {
  const entries =
    viewMode === 'status'
      ? Object.entries(STATUS).map(([, value]) => ({
          label: value.label,
          fill: value.fill,
          stroke: value.stroke,
        }))
      : Object.values(CATEGORY_GROUP).map((group) => ({
          label: group.label,
          fill: group.fill,
          stroke: group.stroke,
        }));

  return (
    <div className="flex flex-wrap items-center gap-4">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect
              x=".5"
              y=".5"
              width="13"
              height="13"
              rx="2"
              fill={entry.fill}
              stroke={entry.stroke}
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-[11px] font-semibold text-ink-500">{entry.label}</span>
        </div>
      ))}
    </div>
  );
}
