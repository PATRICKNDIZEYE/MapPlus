'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapActions, useSelectedShop } from '@/store/map.store';
import type { FloorMapGeoJSON } from '@mallguide/shared';

interface MapCanvasProps {
  floorGeoJSON: FloorMapGeoJSON;
  buildingLat: number;
  buildingLng: number;
  routeCoordinates?: [number, number][];
  userAnchorCoordinates?: [number, number];
  className?: string;
}

type GeoPoint = [number, number];

const STATUS_FILL = {
  occupied: '#34d399',
  vacant: '#e2e8f0',
  reserved: '#fbbf24',
  maintenance: '#f87171',
  non_leasable: '#cbd5e1',
} as const;
const STATUS_STROKE = {
  occupied: '#065f46',
  vacant: '#94a3b8',
  reserved: '#b45309',
  maintenance: '#b91c1c',
  non_leasable: '#94a3b8',
} as const;

// Wall heights (meters) by status — kept LOW so the floor reads as an
// interior dollhouse, not a city of skyscraper boxes. Combined with the
// translucent paint, the camera sees over and into each shop instead of
// staring at solid blocks.
const STATUS_HEIGHT = {
  occupied:     1.3,
  reserved:     0.9,
  maintenance:  0.5,
  vacant:       0.05,
  non_leasable: 0.15,
} as const;

// Brand indigo — used to highlight the selected unit.
const SELECTED_FILL   = '#7C3AED';
const SELECTED_STROKE = '#4B0082';

function isLowEndOrMobile(): boolean {
  if (typeof window === 'undefined') return false;
  // Skip the 3D pass on small viewports + thin devices. Real estate is
  // already tight on mobile, and fill-extrusion + pitch tax the GPU.
  const narrow  = window.matchMedia('(max-width: 768px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores   = (navigator as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  return narrow || reduced || cores < 4;
}

// Blank style — no city tiles, no roads. The building polygons are the map.
const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'plate',
      type: 'background',
      paint: { 'background-color': '#f4f6fa' },
    },
  ],
};

export function MapCanvas({
  floorGeoJSON,
  buildingLat,
  buildingLng,
  routeCoordinates,
  userAnchorCoordinates,
  className,
}: MapCanvasProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const lowEndRef = useRef<boolean>(false);
  const { selectShop } = useMapActions();
  const selectedShop = useSelectedShop();

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const lowEnd = isLowEndOrMobile();
    lowEndRef.current = lowEnd;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [buildingLng, buildingLat],
      zoom: 19.2,
      minZoom: 17,
      maxZoom: 22,
      // Lower pitch on desktop so it reads as a 3D floor plan looked
      // down at, not a city skyline; flat on mobile/reduced-motion.
      pitch: lowEnd ? 0 : 28,
      bearing: 0,
      attributionControl: false,
      dragRotate: !lowEnd,
      pitchWithRotate: !lowEnd,
      touchPitch: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: !lowEnd, visualizePitch: !lowEnd }),
      'bottom-right',
    );

    map.on('load', () => {
      addBuildingLayers(map, floorGeoJSON);
      addFloorLayers(map, floorGeoJSON, lowEnd);
      fitMapToFloor(map, floorGeoJSON);
      if (userAnchorCoordinates) addUserMarker(map, userAnchorCoordinates);
      if (routeCoordinates?.length) addRoute(map, routeCoordinates);
    });

    map.on('click', 'units-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as { id: string; shopId: string | null; shopName: string | null; unitCode: string; category: string | null };
      if (p.shopId) {
        selectShop({ shopId: p.shopId, shopName: p.shopName ?? p.unitCode, unitId: p.id, unitCode: p.unitCode, category: p.category });
      }
    });

    // Hover state — feeds the extrusion's lift expression so units rise on
    // hover. Falls back to a cursor change on the flat (mobile) layer.
    map.on('mousemove', 'units-fill', (e) => {
      const f = e.features?.[0];
      if (!f || f.id == null) return;
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== f.id) {
        map.setFeatureState({ source: 'units', id: hoveredIdRef.current }, { hover: false });
      }
      hoveredIdRef.current = f.id;
      map.setFeatureState({ source: 'units', id: f.id }, { hover: true });
      ((map.getCanvas() as unknown) as { style: { cursor: string } }).style.cursor = 'pointer';
    });
    map.on('mouseleave', 'units-fill', () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: 'units', id: hoveredIdRef.current }, { hover: false });
        hoveredIdRef.current = null;
      }
      ((map.getCanvas() as unknown) as { style: { cursor: string } }).style.cursor = '';
    });

    mapRef.current = map;
  }, [buildingLat, buildingLng]); // eslint-disable-line

  useEffect(() => {
    initMap();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // Update floor: refresh sources for units, amenities, building outline, parking.
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const unitsSrc = map.getSource('units') as maplibregl.GeoJSONSource | undefined;
    if (unitsSrc) {
      unitsSrc.setData(floorGeoJSON.units);
      const aSrc = map.getSource('amenities') as maplibregl.GeoJSONSource | undefined;
      if (aSrc) aSrc.setData(floorGeoJSON.amenities);

      const shellSrc = map.getSource('building-shell') as maplibregl.GeoJSONSource | undefined;
      if (shellSrc) shellSrc.setData(deriveShellGeoJSON(floorGeoJSON));

      const parkingSrc = map.getSource('parking') as maplibregl.GeoJSONSource | undefined;
      if (parkingSrc) parkingSrc.setData(deriveParkingGeoJSON(floorGeoJSON));
    } else {
      addBuildingLayers(map, floorGeoJSON);
      addFloorLayers(map, floorGeoJSON, lowEndRef.current);
    }
    fitMapToFloor(map, floorGeoJSON);
  }, [floorGeoJSON]);

  // Camera framing + selected-unit highlight. When the user picks a shop
  // (from the sidebar, trending strip, or by tapping a unit), ease the
  // camera over its centroid, lift its block, and drop a pulse marker on
  // top so the user can't lose track of which box is "the one".
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const run = () => {
      // Guard the source — feature-state calls throw if the source isn't
      // registered yet (e.g. between floor swaps).
      if (!map.getSource('units')) return;

      const prevMarker = selectedMarkerRef.current;
      if (prevMarker) { prevMarker.remove(); selectedMarkerRef.current = null; }

      if (!selectedShop?.unitId) {
        map.removeFeatureState({ source: 'units' });
        return;
      }

      const feature = floorGeoJSON.units.features.find(
        (f) => f.properties?.id === selectedShop.unitId,
      );
      if (!feature || feature.geometry?.type !== 'Polygon') return;

      map.removeFeatureState({ source: 'units' });
      map.setFeatureState({ source: 'units', id: selectedShop.unitId }, { selected: true });

      const ring = feature.geometry.coordinates[0] as GeoPoint[];
      const centroid = polygonCentroid(ring);

      if (!lowEndRef.current) {
        map.easeTo({
          center: centroid,
          zoom:    Math.max(map.getZoom(), 20.6),
          pitch:   42,
          bearing: 0,
          duration: 900,
        });
      } else {
        map.easeTo({ center: centroid, zoom: Math.max(map.getZoom(), 20.6), duration: 600 });
      }

      const doc = (globalThis as unknown as { document: Document }).document;
      const el  = doc.createElement('div');
      el.className = 'mg-pulse-dot';
      el.innerHTML = `
        <span class="mg-pulse-ring"></span>
        <span class="mg-pulse-ring mg-pulse-ring--delayed"></span>
        <span class="mg-pulse-core"></span>
      `;
      selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(centroid)
        .addTo(map);
    };

    if (map.isStyleLoaded() && map.getSource('units')) {
      run();
    } else {
      // Defer until the style finishes loading.
      map.once('idle', run);
    }
  }, [selectedShop, floorGeoJSON]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    const geojson = routeCoordinates?.length
      ? { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: routeCoordinates }, properties: {} }
      : { type: 'FeatureCollection' as const, features: [] as any[] };
    if (src) src.setData(geojson as any);
    else if (routeCoordinates?.length) addRoute(map, routeCoordinates);
  }, [routeCoordinates]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}

// ── Building shell + parking ─────────────────────────────────────────────────

function toPointKey([lng, lat]: GeoPoint) {
  return `${lng.toFixed(9)},${lat.toFixed(9)}`;
}

function equalPoint(a: GeoPoint, b: GeoPoint) {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Detects the building footprint from unit polygons by collecting edges
 * shared by exactly one polygon (i.e. exterior walls), then linking them
 * into closed loops.
 */
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
  edges.forEach((edge) => {
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

    if (!equalPoint(loop[0]!, loop[loop.length - 1]!)) loop.push(loop[0]!);
    if (loop.length >= 4) loops.push(loop);
  });

  return loops;
}

function projectedArea(ring: GeoPoint[]) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function deriveShellGeoJSON(data: FloorMapGeoJSON): GeoJSON.FeatureCollection {
  const loops = collectExteriorLoops(data.units.features)
    .map((loop) => ({ loop, area: projectedArea(loop) }))
    .sort((a, b) => b.area - a.area);

  const outer = loops[0]?.loop;
  if (!outer) return { type: 'FeatureCollection', features: [] };

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [outer] },
        properties: { kind: 'outer' },
      },
    ],
  };
}

function deriveParkingGeoJSON(data: FloorMapGeoJSON): GeoJSON.FeatureCollection {
  if (data.floorNumber !== 0) return { type: 'FeatureCollection', features: [] };

  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const f of data.units.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const [lng, lat] of f.geometry.coordinates[0] as GeoPoint[]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return { type: 'FeatureCollection', features: [] };

  const dLat = (maxLat - minLat) * 0.32;
  const inset = (maxLng - minLng) * 0.04;
  const gap = (maxLat - minLat) * 0.04;
  const w = minLng + inset;
  const e = maxLng - inset;

  const south: GeoPoint[] = [
    [w, minLat - gap - dLat], [e, minLat - gap - dLat],
    [e, minLat - gap], [w, minLat - gap], [w, minLat - gap - dLat],
  ];
  const north: GeoPoint[] = [
    [w, maxLat + gap], [e, maxLat + gap],
    [e, maxLat + gap + dLat], [w, maxLat + gap + dLat], [w, maxLat + gap],
  ];

  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [south] }, properties: { label: 'PARKING' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [north] }, properties: { label: 'PARKING' } },
    ],
  };
}

// ── Layer setup ──────────────────────────────────────────────────────────────

function addBuildingLayers(map: maplibregl.Map, data: FloorMapGeoJSON) {
  if (!map.getSource('parking')) {
    map.addSource('parking', { type: 'geojson', data: deriveParkingGeoJSON(data) });
    map.addLayer({
      id: 'parking-fill',
      type: 'fill',
      source: 'parking',
      paint: { 'fill-color': '#334155', 'fill-opacity': 0.85 },
    });
    map.addLayer({
      id: 'parking-stripe',
      type: 'line',
      source: 'parking',
      paint: { 'line-color': '#fbbf24', 'line-width': 1.2, 'line-opacity': 0.6, 'line-dasharray': [1, 4] },
    });
    map.addLayer({
      id: 'parking-label',
      type: 'symbol',
      source: 'parking',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 13,
        'text-letter-spacing': 0.22,
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#fde68a',
        'text-halo-color': '#1f2937',
        'text-halo-width': 1,
      },
    });
  }

  if (!map.getSource('building-shell')) {
    map.addSource('building-shell', { type: 'geojson', data: deriveShellGeoJSON(data) });
    // Warm cream interior floor — reads as a real mall corridor surface
    // rather than blank sidewalk, especially with translucent walls
    // sitting on top.
    map.addLayer({
      id: 'building-shell-fill',
      type: 'fill',
      source: 'building-shell',
      paint: { 'fill-color': '#FAF6EE', 'fill-opacity': 1 },
    });
    map.addLayer({
      id: 'building-shell-stroke',
      type: 'line',
      source: 'building-shell',
      paint: { 'line-color': '#1e293b', 'line-width': 2 },
    });
  }
}

function addFloorLayers(map: maplibregl.Map, data: FloorMapGeoJSON, lowEnd: boolean) {
  if (!map.getSource('units')) {
    // promoteId lets us address features by their `id` property for
    // feature-state lookups (hover/selected).
    map.addSource('units', { type: 'geojson', data: data.units, promoteId: 'id' });
  }

  if (!map.getLayer('units-fill')) {
    if (lowEnd) {
      // 2D fallback on mobile / reduced motion.
      map.addLayer({
        id: 'units-fill',
        type: 'fill',
        source: 'units',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], SELECTED_FILL,
            ['match', ['get', 'status'],
              'occupied',    STATUS_FILL.occupied,
              'vacant',      STATUS_FILL.vacant,
              'reserved',    STATUS_FILL.reserved,
              'maintenance', STATUS_FILL.maintenance,
              STATUS_FILL.non_leasable,
            ],
          ],
          'fill-opacity': 0.92,
        },
      });
    } else {
      // 3D extrusion — gives every occupied unit real depth + shading.
      map.addLayer({
        id: 'units-fill',
        type: 'fill-extrusion',
        source: 'units',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], SELECTED_FILL,
            ['match', ['get', 'status'],
              'occupied',    STATUS_FILL.occupied,
              'vacant',      STATUS_FILL.vacant,
              'reserved',    STATUS_FILL.reserved,
              'maintenance', STATUS_FILL.maintenance,
              STATUS_FILL.non_leasable,
            ],
          ],
          // Translucent walls let the eye see through to the warm floor —
          // this is what turns "city of boxes" into "interior dollhouse".
          'fill-extrusion-opacity': 0.62,
          'fill-extrusion-vertical-gradient': true, // shades sides darker for depth
          'fill-extrusion-height': [
            // Hovered / selected units lift higher so they pop forward.
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.4,
            ['boolean', ['feature-state', 'hover'], false],    1.9,
            ['match', ['get', 'status'],
              'occupied',    STATUS_HEIGHT.occupied,
              'vacant',      STATUS_HEIGHT.vacant,
              'reserved',    STATUS_HEIGHT.reserved,
              'maintenance', STATUS_HEIGHT.maintenance,
              STATUS_HEIGHT.non_leasable,
            ],
          ],
          'fill-extrusion-base': 0,
        },
      });
    }
  }

  if (!map.getLayer('units-stroke')) {
    map.addLayer({
      id: 'units-stroke',
      type: 'line',
      source: 'units',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], SELECTED_STROKE,
          ['match', ['get', 'status'],
            'occupied',    STATUS_STROKE.occupied,
            'vacant',      STATUS_STROKE.vacant,
            'reserved',    STATUS_STROKE.reserved,
            'maintenance', STATUS_STROKE.maintenance,
            STATUS_STROKE.non_leasable,
          ],
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 2.5,
          ['==', ['get', 'status'], 'occupied'], 1.5,
          1,
        ],
      },
    });
  }

  if (!map.getLayer('units-label')) {
    map.addLayer({
      id: 'units-label',
      type: 'symbol',
      source: 'units',
      filter: ['all', ['==', ['get', 'status'], 'occupied'], ['!=', ['get', 'shopName'], null]] as any,
      layout: {
        'text-field': ['coalesce', ['get', 'shopName'], ['get', 'unitCode']],
        'text-size': 11,
        'text-max-width': 8,
        'text-anchor': 'center',
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  if (!map.getLayer('units-code')) {
    map.addLayer({
      id: 'units-code',
      type: 'symbol',
      source: 'units',
      filter: ['==', ['get', 'status'], 'vacant'],
      layout: {
        'text-field': ['get', 'unitCode'],
        'text-size': 9,
        'text-anchor': 'center',
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#94a3b8',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    });
  }

  if (!map.getSource('amenities')) {
    map.addSource('amenities', { type: 'geojson', data: data.amenities });
    map.addLayer({
      id: 'amenity-circle',
      type: 'circle',
      source: 'amenities',
      paint: {
        'circle-radius': 7,
        'circle-color': '#0ea5e9',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });
  }
}

function fitMapToFloor(map: maplibregl.Map, data: FloorMapGeoJSON) {
  const points: GeoPoint[] = data.units.features.flatMap((feature) =>
    feature.geometry?.type === 'Polygon'
      ? (feature.geometry.coordinates.flat() as GeoPoint[])
      : []
  );

  // Include parking polygons on the ground floor so the viewport zooms out
  // enough to surface them.
  if (data.floorNumber === 0) {
    const parking = deriveParkingGeoJSON(data).features;
    for (const f of parking) {
      if (f.geometry.type === 'Polygon') {
        for (const ring of f.geometry.coordinates) points.push(...(ring as GeoPoint[]));
      }
    }
  }

  if (!points.length) return;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  points.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  map.fitBounds(
    [[minLng, minLat], [maxLng, maxLat]],
    { padding: { top: 80, right: 60, bottom: 80, left: 60 }, duration: 350, maxZoom: 20.5 },
  );
}

function addUserMarker(map: maplibregl.Map, coords: [number, number]) {
  const el = ((globalThis as unknown) as {
    document: {
      createElement: (tag: string) => { className: string; style: { cssText: string } };
    };
  }).document.createElement('div');
  el.className = 'user-dot';
  el.style.cssText = `
    width: 18px; height: 18px;
    background: #0ea5e9;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(14,165,233,0.25), 0 2px 8px rgba(0,0,0,0.2);
  `;
  new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
}

function polygonCentroid(ring: GeoPoint[]): GeoPoint {
  // Area-weighted centroid of a closed ring (shoelace). For our small
  // building-scale polygons we treat lng/lat as planar — the error vs. a
  // proper geodesic centroid is well under a meter, invisible at building
  // scale.
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx   += (x1 + x2) * cross;
    cy   += (y1 + y2) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) {
    // Degenerate polygon — fall back to the mean of vertices.
    const sum = ring.reduce<[number, number]>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / ring.length, sum[1] / ring.length];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

function addRoute(map: maplibregl.Map, coords: [number, number][]) {
  const data: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {},
  };
  if (map.getSource('route')) {
    (map.getSource('route') as maplibregl.GeoJSONSource).setData(data);
    return;
  }
  map.addSource('route', { type: 'geojson', data });
  map.addLayer({ id: 'route-casing', type: 'line', source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 10 } });
  map.addLayer({ id: 'route-line', type: 'line', source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#0ea5e9', 'line-width': 5 } });
}
