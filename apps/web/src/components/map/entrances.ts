// Synthetic entrance derivation for the shopper map.
//
// Until the database carries real entrance amenities, we generate four
// entrances directly from the building's exterior polygon: one on each
// cardinal edge (N, S, E, W). They live only on the ground floor.

import type { FloorMapGeoJSON } from '@mallguide/shared';

export interface Entrance {
  id:          string;
  label:       string;
  coordinates: [number, number]; // [lng, lat]
  /** A photo to help shoppers visually identify which door they walked through. */
  photoUrl:    string;
}

// Unsplash placeholders by cardinal direction — each one chosen to feel
// like a distinct mall entrance so shoppers can visually pick "the one
// I came in through". Swap to real CHIC entrance photos when uploaded.
const ENTRANCE_PHOTOS: Record<string, string> = {
  'entrance-S': 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=480&q=80', // main / south
  'entrance-N': 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=480&q=80',
  'entrance-E': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=480&q=80',
  'entrance-W': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=480&q=80',
};

type Pt = [number, number];

/**
 * Returns up to 4 cardinal entrances inferred from the floor's building
 * shell. Each entrance's coordinate is the point on the shell perimeter
 * closest to the bbox-edge midpoint of that direction.
 */
export function deriveEntrances(geo: FloorMapGeoJSON): Entrance[] {
  // Entrances are a ground-floor concept.
  if (geo.floorNumber !== 0) return [];

  // Collect all polygon vertices to compute bbox.
  const pts: Pt[] = [];
  for (const f of geo.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const p of f.geometry.coordinates[0] as Pt[]) pts.push(p);
  }
  if (pts.length < 4) return [];

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  // Find the closest perimeter vertex to each cardinal midpoint. Good
  // enough for a synthetic entrance — when real ones land in the DB
  // they replace these.
  const candidates: Array<{ id: string; label: string; target: Pt }> = [
    { id: 'entrance-N', label: 'North entrance',  target: [midLng, maxLat] },
    { id: 'entrance-S', label: 'Main entrance',   target: [midLng, minLat] }, // main is south by convention
    { id: 'entrance-E', label: 'East entrance',   target: [maxLng, midLat] },
    { id: 'entrance-W', label: 'West entrance',   target: [minLng, midLat] },
  ];

  return candidates.map(({ id, label, target }) => {
    let bestDist = Infinity;
    let best: Pt = target;
    for (const p of pts) {
      const d = (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return {
      id,
      label,
      coordinates: best,
      photoUrl: ENTRANCE_PHOTOS[id] ?? ENTRANCE_PHOTOS['entrance-S']!,
    };
  });
}

/**
 * Builds a 4-point polyline from the entrance to the shop, routed via
 * the building's center as a stand-in for the main corridor. Not a real
 * shortest-path — purely visual until the routing graph is in place.
 */
export function synthesizeRoute(
  start: Pt,
  end:   Pt,
  geo:   FloorMapGeoJSON,
): Pt[] {
  // Compute building bbox to find a "centerline" point.
  const pts: Pt[] = [];
  for (const f of geo.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const p of f.geometry.coordinates[0] as Pt[]) pts.push(p);
  }
  if (!pts.length) return [start, end];

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  // Two waypoints: enter the central corridor on the same axis as the
  // entrance, then walk along it to the shop's latitude.
  const wp1: Pt = [start[0] > midLng ? midLng + (start[0] - midLng) * 0.3 : midLng - (midLng - start[0]) * 0.3, start[1]];
  const wp2: Pt = [end[0],   end[1] > midLat ? midLat + (end[1] - midLat) * 0.3 : midLat - (midLat - end[1]) * 0.3];

  // Drop the central spine waypoint when start/end are already close to
  // it — avoids zig-zags for shops in the middle.
  const tooFlat = Math.abs(start[1] - end[1]) < (maxLat - minLat) * 0.05;
  if (tooFlat) return [start, [midLng, start[1]], end];

  return [start, wp1, [wp1[0], wp2[1]], wp2, end];
}
