'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapActions } from '@/store/map.store';
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
  const { selectShop } = useMapActions();

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [buildingLng, buildingLat],
      zoom: 19.2,
      minZoom: 17,
      maxZoom: 22,
      pitch: 0,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      'bottom-right',
    );

    map.on('load', () => {
      addBuildingLayers(map, floorGeoJSON);
      addFloorLayers(map, floorGeoJSON);
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

    map.on('mouseenter', 'units-fill', () => {
      ((map.getCanvas() as unknown) as { style: { cursor: string } }).style.cursor = 'pointer';
    });
    map.on('mouseleave', 'units-fill', () => {
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
      addFloorLayers(map, floorGeoJSON);
    }
    fitMapToFloor(map, floorGeoJSON);
  }, [floorGeoJSON]);

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
    map.addLayer({
      id: 'building-shell-fill',
      type: 'fill',
      source: 'building-shell',
      paint: { 'fill-color': '#ffffff', 'fill-opacity': 1 },
    });
    map.addLayer({
      id: 'building-shell-stroke',
      type: 'line',
      source: 'building-shell',
      paint: { 'line-color': '#1e293b', 'line-width': 2 },
    });
  }
}

function addFloorLayers(map: maplibregl.Map, data: FloorMapGeoJSON) {
  if (!map.getSource('units')) {
    map.addSource('units', { type: 'geojson', data: data.units });
  }

  if (!map.getLayer('units-fill')) {
    map.addLayer({
      id: 'units-fill',
      type: 'fill',
      source: 'units',
      paint: {
        'fill-color': [
          'match', ['get', 'status'],
          'occupied',    STATUS_FILL.occupied,
          'vacant',      STATUS_FILL.vacant,
          'reserved',    STATUS_FILL.reserved,
          'maintenance', STATUS_FILL.maintenance,
          STATUS_FILL.non_leasable,
        ],
        'fill-opacity': 0.92,
      },
    });
  }

  if (!map.getLayer('units-stroke')) {
    map.addLayer({
      id: 'units-stroke',
      type: 'line',
      source: 'units',
      paint: {
        'line-color': [
          'match', ['get', 'status'],
          'occupied',    STATUS_STROKE.occupied,
          'vacant',      STATUS_STROKE.vacant,
          'reserved',    STATUS_STROKE.reserved,
          'maintenance', STATUS_STROKE.maintenance,
          STATUS_STROKE.non_leasable,
        ],
        'line-width': ['case', ['==', ['get', 'status'], 'occupied'], 1.5, 1],
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
