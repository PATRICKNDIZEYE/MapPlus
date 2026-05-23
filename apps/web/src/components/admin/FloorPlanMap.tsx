'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FloorMapGeoJSON, UnitFeatureProperties } from '@mapplus/shared';
import type { StyleSpecification } from 'maplibre-gl';

// ── Colour system ─────────────────────────────────────────────────────────────
//
// Rule: every fill must achieve > 2.5:1 contrast against the building fill (#ffffff).
// Pastels fail. Use -400 or darker Tailwind swatches minimum.
//
// Reference image (Modern Loft Plaza) uses:
//   Signed  → bright green    Vacant → light gray
//   Awaiting→ amber/gold      Terminated → red accent
//
// We follow the same logic.

const STATUS_FILL: Record<string, string> = {
  occupied:    '#4ade80',   // green-400   ← clearly leased
  vacant:      '#e2e8f0',   // slate-200   ← empty, neutral gray
  reserved:    '#fbbf24',   // amber-400   ← awaiting / in negotiation
  maintenance: '#f87171',   // red-400     ← out of service
};
const STATUS_FILL_DEFAULT = '#cbd5e1';  // slate-300

const STATUS_STROKE: Record<string, string> = {
  occupied:    '#16a34a',   // green-600
  vacant:      '#94a3b8',   // slate-400
  reserved:    '#d97706',   // amber-600
  maintenance: '#dc2626',   // red-600
};
const STATUS_STROKE_DEFAULT = '#94a3b8';

// Category view — every category gets a distinct mid-tone colour
const CATEGORY_FILL: Record<string, string> = {
  'Electronics':        '#a5b4fc',   // indigo-300
  'Fashion & Apparel':  '#f9a8d4',   // pink-300
  'Food & Beverages':   '#86efac',   // green-300
  'Health & Pharmacy':  '#6ee7b7',   // emerald-300
  'Banking & Finance':  '#93c5fd',   // blue-300
  'Beauty & Cosmetics': '#f0abfc',   // fuchsia-300
  'Sports & Fitness':   '#fcd34d',   // amber-300
  'Entertainment':      '#fdba74',   // orange-300
};
const CATEGORY_FILL_DEFAULT = '#e2e8f0';

const CATEGORY_STROKE: Record<string, string> = {
  'Electronics':        '#4338ca',
  'Fashion & Apparel':  '#9d174d',
  'Food & Beverages':   '#15803d',
  'Health & Pharmacy':  '#065f46',
  'Banking & Finance':  '#1d4ed8',
  'Beauty & Cosmetics': '#86198f',
  'Sports & Fitness':   '#92400e',
  'Entertainment':      '#9a3412',
};
const CATEGORY_STROKE_DEFAULT = '#475569';

// ── Convert colour maps to MapLibre match expressions ─────────────────────────

function toMatchExpr(
  prop: string,
  map: Record<string, string>,
  fallback: string,
): maplibregl.ExpressionSpecification {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(map)) pairs.push(k, v);
  return ['match', ['get', prop], ...pairs, fallback] as unknown as maplibregl.ExpressionSpecification;
}

const STATUS_FILL_EXPR   = toMatchExpr('status',   STATUS_FILL,    STATUS_FILL_DEFAULT);
const STATUS_STROKE_EXPR = toMatchExpr('status',   STATUS_STROKE,  STATUS_STROKE_DEFAULT);
const CAT_FILL_EXPR      = toMatchExpr('category', CATEGORY_FILL,  CATEGORY_FILL_DEFAULT);
const CAT_STROKE_EXPR    = toMatchExpr('category', CATEGORY_STROKE,CATEGORY_STROKE_DEFAULT);

// ── Blank style (no basemap) ──────────────────────────────────────────────────

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  // Slate-700 background — makes the building stand out as an isolated plan,
  // not a pin floating in empty space.
  layers:  [{ id: 'bg', type: 'background', paint: { 'background-color': '#334155' } }],
  glyphs:  'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sprite:  '',
};

// ── Building constants (must match reset-geometry.js) ────────────────────────

const M  = 0.0000090;
const CX = 30.059888;
const CY = -1.944218;
const BW = CX - 80 * M,  BE = CX + 80 * M;
const BN = CY + 42 * M,  BS = CY - 42 * M;
const CN = CY + 4.5 * M, CS = CY - 4.5 * M;

const BUILDING_GEO: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[BW, BS],[BE, BS],[BE, BN],[BW, BN],[BW, BS]]],
    },
  }],
};

const CORRIDOR_GEO: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[BW, CS],[BE, CS],[BE, CN],[BW, CN],[BW, CS]]],
    },
  }],
};

// ── Props ─────────────────────────────────────────────────────────────────────

export type FloorPlanViewMode = 'status' | 'category';

interface FloorPlanMapProps {
  floorGeoJSON:   FloorMapGeoJSON;
  viewMode:       FloorPlanViewMode;
  selectedUnitId: string | null;
  onUnitClick:    (props: UnitFeatureProperties) => void;
  className?:     string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FloorPlanMap({
  floorGeoJSON,
  viewMode,
  selectedUnitId,
  onUnitClick,
  className,
}: FloorPlanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const [ready,      setReady] = useState(false);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     BLANK_STYLE,
      center:    [CX, CY],
      zoom:      18,
      minZoom:   17,
      maxZoom:   23,
      // Lock pan to the building so it never scrolls off-screen
      maxBounds: [
        [BW - 0.0005, BS - 0.0005],
        [BE + 0.0005, BN + 0.0005],
      ],
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    // Fit the viewport tightly to the building on first load
    // 20% padding so the building fills most of the view
    map.on('load', () => {
      map.fitBounds(
        [[BW, BS], [BE, BN]],
        { padding: { top: 40, bottom: 40, left: 40, right: 40 }, duration: 0 },
      );

      // ── 1. Building shell ────────────────────────────────────────────────────
      map.addSource('building', { type: 'geojson', data: BUILDING_GEO });
      map.addLayer({
        id: 'building-fill', type: 'fill', source: 'building',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 1 },
      });
      map.addLayer({
        id: 'building-line', type: 'line', source: 'building',
        paint: { 'line-color': '#334155', 'line-width': 3 },
      });

      // ── 2. Corridor ──────────────────────────────────────────────────────────
      map.addSource('corridor', { type: 'geojson', data: CORRIDOR_GEO });
      map.addLayer({
        id: 'corridor-fill', type: 'fill', source: 'corridor',
        paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.8 },
      });

      // ── 3. Units ─────────────────────────────────────────────────────────────
      map.addSource('units', { type: 'geojson', data: floorGeoJSON.units });

      // Solid fill — status view by default
      map.addLayer({
        id: 'units-fill', type: 'fill', source: 'units',
        paint: {
          'fill-color':   STATUS_FILL_EXPR,
          'fill-opacity': 0.90,
        },
      });

      // Bold outline — matches fill family
      map.addLayer({
        id: 'units-line', type: 'line', source: 'units',
        paint: {
          'line-color': STATUS_STROKE_EXPR,
          'line-width': ['interpolate', ['linear'], ['zoom'], 17, 1, 20, 2.5],
        },
      });

      // Selected unit highlight — rendered as a separate layer on top
      map.addLayer({
        id: 'units-selected', type: 'fill', source: 'units',
        filter: ['==', ['get', 'id'], ''],          // nothing selected initially
        paint: {
          'fill-color':   '#000000',
          'fill-opacity': 0.15,
        },
      });
      map.addLayer({
        id: 'units-selected-line', type: 'line', source: 'units',
        filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': '#0f172a', 'line-width': 3 },
      });

      // Shop name — fades in at zoom 18.5
      map.addLayer({
        id:     'units-name',
        type:   'symbol',
        source: 'units',
        filter: ['all', ['==', ['get', 'status'], 'occupied'], ['has', 'shopName']],
        layout: {
          'text-field':     ['coalesce', ['get', 'shopName'], ''],
          'text-size':      ['interpolate', ['linear'], ['zoom'], 18, 8, 20, 12, 22, 16],
          'text-max-width': 7,
          'text-anchor':    'center',
          'text-font':      ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color':      '#0f172a',
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 2,
          'text-opacity':    ['interpolate', ['linear'], ['zoom'], 18, 0, 18.8, 1],
        },
      });

      // Unit code — always visible, smaller
      map.addLayer({
        id:     'units-code',
        type:   'symbol',
        source: 'units',
        layout: {
          'text-field':  ['get', 'unitCode'],
          'text-size':   ['interpolate', ['linear'], ['zoom'], 17, 7, 20, 10],
          'text-anchor': 'center',
          'text-offset': ['case',
            ['all', ['==', ['get', 'status'], 'occupied'], ['has', 'shopName']],
            ['literal', [0, 1.2]],
            ['literal', [0, 0]],
          ],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color':      STATUS_STROKE_EXPR,
          'text-halo-color': 'rgba(255,255,255,0.8)',
          'text-halo-width': 1,
          'text-opacity':    0.8,
        },
      });

      // ── 4. Amenities ─────────────────────────────────────────────────────────
      map.addSource('amenities', { type: 'geojson', data: floorGeoJSON.amenities });
      map.addLayer({
        id: 'amenities', type: 'circle', source: 'amenities',
        paint: {
          'circle-radius':       ['interpolate', ['linear'], ['zoom'], 17, 4, 20, 9],
          'circle-color':        '#0ea5e9',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // ── 5. Interactions ──────────────────────────────────────────────────────
      map.on('click', 'units-fill', (e) => {
        const f = e.features?.[0];
        if (f) onUnitClick(f.properties as UnitFeatureProperties);
      });
      map.on('mouseenter', 'units-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'units-fill', () => { map.getCanvas().style.cursor = ''; });

      setReady(true);
    });

    mapRef.current = map;
  }, []); // eslint-disable-line

  useEffect(() => {
    initMap();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // Update floor data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource('units')     as maplibregl.GeoJSONSource | undefined)?.setData(floorGeoJSON.units);
    (map.getSource('amenities') as maplibregl.GeoJSONSource | undefined)?.setData(floorGeoJSON.amenities);
  }, [floorGeoJSON, ready]);

  // Switch view mode — swap fill + stroke expressions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fill   = viewMode === 'status' ? STATUS_FILL_EXPR : CAT_FILL_EXPR;
    const stroke = viewMode === 'status' ? STATUS_STROKE_EXPR : CAT_STROKE_EXPR;
    map.setPaintProperty('units-fill', 'fill-color', fill);
    map.setPaintProperty('units-line', 'line-color', stroke);
  }, [viewMode, ready]);

  // Highlight selected unit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const filter: maplibregl.FilterSpecification = selectedUnitId
      ? ['==', ['get', 'id'], selectedUnitId]
      : ['==', ['get', 'id'], ''];

    map.setFilter('units-selected',      filter);
    map.setFilter('units-selected-line', filter);

    if (selectedUnitId) {
      const f = floorGeoJSON.units.features.find((ft) => ft.properties?.id === selectedUnitId);
      if (f?.geometry?.type === 'Polygon') {
        const coords = (f.geometry as GeoJSON.Polygon).coordinates[0]!;
        const cx = coords.reduce((s, c) => s + c[0]!, 0) / coords.length;
        const cy = coords.reduce((s, c) => s + c[1]!, 0) / coords.length;
        map.easeTo({ center: [cx, cy], zoom: Math.max(map.getZoom(), 19.5), duration: 350 });
      }
    }
  }, [selectedUnitId, floorGeoJSON, ready]);

  return <div ref={containerRef} className={className} />;
}
