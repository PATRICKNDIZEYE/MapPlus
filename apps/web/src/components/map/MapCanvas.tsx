'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapActions } from '@/store/map.store';
import type { FloorMapGeoJSON } from '@mapplus/shared';

interface MapCanvasProps {
  floorGeoJSON: FloorMapGeoJSON;
  buildingLat: number;
  buildingLng: number;
  routeCoordinates?: [number, number][];
  userAnchorCoordinates?: [number, number];
  className?: string;
}

// Status → fill colour — purposeful, readable at high zoom
const STATUS_FILL = {
  occupied: '#4ade80',
  vacant: '#e2e8f0',
  reserved: '#fbbf24',
  maintenance: '#f87171',
  non_leasable: '#cbd5e1',
} as const;
const STATUS_STROKE = {
  occupied: '#166534',
  vacant: '#64748b',
  reserved: '#b45309',
  maintenance: '#b91c1c',
  non_leasable: '#64748b',
} as const;


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
      // Carto Positron No Labels — cleanest style for indoor maps.
      // Pure base geography, no street labels cluttering the unit polygons.
      style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
      center: [buildingLng, buildingLat],
      zoom: 19.5,
      minZoom: 17,
      maxZoom: 22,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      'bottom-right',
    );
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      addFloorLayers(map, floorGeoJSON);
      fitMapToUnits(map, floorGeoJSON);
      if (userAnchorCoordinates) addUserMarker(map, userAnchorCoordinates);
      if (routeCoordinates?.length) addRoute(map, routeCoordinates);
    });

    // Click unit → open shop
    map.on('click', 'units-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as { id: string; shopId: string | null; shopName: string | null; unitCode: string; category: string | null };
      if (p.shopId) {
        selectShop({ shopId: p.shopId, shopName: p.shopName ?? p.unitCode, unitId: p.id, unitCode: p.unitCode, category: p.category });
      }
    });

    // Hover cursor
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

  // Update floor
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const src = map.getSource('units') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(floorGeoJSON.units);
      const aSrc = map.getSource('amenities') as maplibregl.GeoJSONSource | undefined;
      if (aSrc) aSrc.setData(floorGeoJSON.amenities);
    } else {
      addFloorLayers(map, floorGeoJSON);
    }
    fitMapToUnits(map, floorGeoJSON);
  }, [floorGeoJSON]);

  // Update route
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

// ── Layer helpers ────────────────────────────────────────────────────────────

function addFloorLayers(map: maplibregl.Map, data: FloorMapGeoJSON) {
  if (!map.getSource('units')) {
    map.addSource('units', { type: 'geojson', data: data.units });
  }

  // Fill
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
        'fill-opacity': 0.9,
      },
    });
  }

  // Stroke
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

  // Shop name labels
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
        'text-color': '#1e3a5f',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  // Unit code for vacant
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
        'text-color': '#9ca3af',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    });
  }

  // Amenity markers
  if (!map.getSource('amenities')) {
    map.addSource('amenities', { type: 'geojson', data: data.amenities });
    map.addLayer({
      id: 'amenity-circle',
      type: 'circle',
      source: 'amenities',
      paint: {
        'circle-radius': 8,
        'circle-color': '#0ea5e9',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }
}

function fitMapToUnits(map: maplibregl.Map, data: FloorMapGeoJSON) {
  const points = data.units.features.flatMap((feature) => {
    if (feature.geometry?.type !== 'Polygon') return [];
    return feature.geometry.coordinates.flat() as [number, number][];
  });

  if (!points.length) return;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  points.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: { top: 48, right: 48, bottom: 48, left: 48 },
      duration: 300,
      maxZoom: 20.5,
    },
  );
}

function addUserMarker(map: maplibregl.Map, coords: [number, number]) {
  const el = ((globalThis as unknown) as {
    document: {
      createElement: (tag: string) => {
        className: string;
        style: { cssText: string };
      };
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
