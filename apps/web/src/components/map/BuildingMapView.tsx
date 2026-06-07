'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type maplibregl from 'maplibre-gl';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import {
  useMapActions, useActiveFloorId, useSelectedShop, useRouteVisible, useMapStore,
  useMapStore as mapStore, useUserAnchor, useRouteDestinationShopId,
  useSearchHighlights, useSearchHighlightLabel,
} from '@/store/map.store';
import { FloorSelector } from './FloorSelector';
import { SearchBar } from '@/components/search/SearchBar';
import { ShopPanel } from './ShopPanel';
import { DirectionsPanel } from './DirectionsPanel';
import { MallHero } from './MallHero';
import { TrendingStrip } from './TrendingStrip';
import { EntrancePicker } from './EntrancePicker';
import { deriveEntrances } from './entrances';
import { buildNavGrid, findPath, centralVerticalPoint } from './pathfinding';
import {
  ArrowLeft, Menu, QrCode, Building2, ChevronUp, X, DoorOpen,
  Laptop2, Shirt, Utensils, Pill, Banknote, Sparkles, Dumbbell, Clapperboard, Store,
  RotateCcw, RotateCw,
} from 'lucide-react';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  'Electronics': Laptop2, 'Fashion & Apparel': Shirt,   'Food & Beverages':   Utensils,
  'Health & Pharmacy': Pill, 'Banking & Finance': Banknote, 'Beauty & Cosmetics': Sparkles,
  'Sports & Fitness': Dumbbell, 'Entertainment': Clapperboard,
};

const MapCanvas = dynamic(() => import('./MapCanvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-50 flex items-center justify-center">
      <BrandedLoader size="lg" label="Loading map…" />
    </div>
  ),
});


interface BuildingMapViewProps {
  buildingSlug: string;
  initialFloorId?: string;
  fromAnchorId?: string;
  /** ?to=<shopId> from the URL — auto-triggers Directions for that shop. */
  autoRouteToShopId?: string;
}

export function BuildingMapView({ buildingSlug, initialFloorId, autoRouteToShopId }: BuildingMapViewProps) {
  const { setActiveBuilding, setActiveFloor, clearRoute, setUserAnchor, selectShop: selectShopAction, setRoute, clearSearchHighlights } = useMapActions();
  const activeFloorId = useActiveFloorId();
  const selectedShop  = useSelectedShop();
  const routeVisible  = useRouteVisible();
  const userAnchor    = useUserAnchor();
  const routeDestinationShopId = useRouteDestinationShopId();
  const searchHighlights = useSearchHighlights();
  const searchHighlightLabel = useSearchHighlightLabel();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const rotateBy = (deg: number) => {
    const m = mapRef.current; if (!m) return;
    m.easeTo({ bearing: m.getBearing() + deg, duration: 350 });
  };
  const resetView = () => {
    const m = mapRef.current; if (!m) return;
    m.easeTo({ bearing: 0, pitch: 28, duration: 450 });
  };

  const { data: building, isLoading: loadingBuilding } =
    trpc.buildings.bySlug.useQuery({ slug: buildingSlug });

  const { data: floors } = trpc.buildings.floors.useQuery(
    { buildingId: building?.id ?? '' }, { enabled: !!building?.id }
  );

  const { data: floorGeoJSON, isLoading: loadingMap } = trpc.map.floorGeoJSON.useQuery(
    { floorId: activeFloorId ?? '' }, { enabled: !!activeFloorId, staleTime: 30_000 }
  );

  const { data: shops } = trpc.shops.listByBuilding.useQuery(
    { buildingId: building?.id ?? '', floorId: activeFloorId ?? undefined },
    { enabled: !!building?.id }
  );

  // Destination shop info — needed for multi-floor routing so we can
  // detect whether the user is currently viewing the destination floor.
  const { data: destShop } = trpc.shops.byId.useQuery(
    { id: routeDestinationShopId ?? '' },
    { enabled: !!routeDestinationShopId },
  );

  useEffect(() => {
    if (building) setActiveBuilding(building.id);
  }, [building, setActiveBuilding]);

  useEffect(() => {
    if (!floors?.length) return;
    const target = initialFloorId
      ? floors.find((f) => f.id === initialFloorId)
      : floors.find((f) => f.floorNumber === 0) ?? floors[0];
    if (target) setActiveFloor(target.id, target.floorNumber);
  }, [floors, initialFloorId, setActiveFloor]);

  // Auto-trigger Directions when ?to=<shopId> is set in the URL. Fires
  // once per shopId so manually closing the route doesn't yank it back.
  const autoRoutedRef = useRef<string | null>(null);
  const autoShopQ = trpc.shops.byId.useQuery(
    { id: autoRouteToShopId ?? '' },
    { enabled: !!autoRouteToShopId },
  );
  useEffect(() => {
    if (!autoRouteToShopId || !autoShopQ.data || autoRoutedRef.current === autoRouteToShopId) return;
    autoRoutedRef.current = autoRouteToShopId;
    const s = autoShopQ.data;
    selectShopAction({
      shopId:   s.id,
      shopName: s.publicName,
      unitId:   s.unitId ?? '',
      unitCode: s.unitCode ?? '',
      category: s.category,
    });
    setRoute(s.id);
  }, [autoRouteToShopId, autoShopQ.data, selectShopAction, setRoute]);

  // Derived map data — must live above the early returns so React sees the
  // same hook order on every render.
  //
  // Build the nav grid FIRST so deriveEntrances can snap each cardinal
  // entrance from a wall vertex INWARD onto a real corridor cell.
  // Without this, the A* start point can sit inside a unit polygon and
  // the polyline appears to cut through walls.
  const navGrid = useMemo(
    () => (floorGeoJSON ? buildNavGrid(floorGeoJSON) : null),
    [floorGeoJSON],
  );

  const entrances = useMemo(
    () => (floorGeoJSON ? deriveEntrances(floorGeoJSON, navGrid) : []),
    [floorGeoJSON, navGrid],
  );

  // Re-sync a previously saved anchor to its freshly-snapped coordinate.
  // localStorage might be holding a wall-vertex anchor from before the
  // snap-inward fix; refreshing it heals the pulse marker + the route
  // start in one shot.
  useEffect(() => {
    if (!userAnchor || !entrances.length) return;
    const fresh = entrances.find((e) => e.id === userAnchor.id);
    if (!fresh) return;
    if (
      fresh.coordinates[0] !== userAnchor.coordinates[0] ||
      fresh.coordinates[1] !== userAnchor.coordinates[1]
    ) {
      setUserAnchor({ id: fresh.id, label: fresh.label, coordinates: fresh.coordinates });
    }
  }, [entrances, userAnchor, setUserAnchor]);

  // Multi-floor route logic.
  //
  // The route can span two floors: ORIGIN (where the user entered — always
  // ground floor for now) and DESTINATION (where the shop lives). When
  // they differ we treat the building's central escalator as the hand-off
  // point — a single lng/lat that's vertically aligned across all floors.
  //
  //   Same floor (origin == destination):
  //     route = entrance → shop centroid (single A* pass)
  //
  //   Cross floor:
  //     leg A (origin floor): entrance → central escalator
  //     leg B (destination floor): central escalator → shop centroid
  //   The map shows ONE leg at a time depending on which floor is
  //   currently active; switching floors via the floor selector flips
  //   between them.
  const routeCoordinates = useMemo<[number, number][] | undefined>(() => {
    if (!routeVisible || !userAnchor || !routeDestinationShopId || !floorGeoJSON || !navGrid || !destShop) return undefined;

    // Same floor as destination (the simple, single-A* case).
    const isDestFloor = floorGeoJSON.floorId === destShop.floorId;
    // Origin floor for now = ground (floorNumber 0). Anchor coords are
    // ONLY meaningful on this floor.
    const isOriginFloor = floorGeoJSON.floorNumber === 0;

    const vp = centralVerticalPoint(floorGeoJSON);

    // Helper — centroid of the destination shop's polygon, if it's on
    // the current floor. Needed for the leg that ends at the shop.
    const destCentroid = ((): [number, number] | null => {
      const dest = floorGeoJSON.units.features.find(
        (f) => f.properties?.shopId === routeDestinationShopId,
      );
      if (!dest || dest.geometry?.type !== 'Polygon') return null;
      const ring = dest.geometry.coordinates[0] as [number, number][];
      let area = 0, cx = 0, cy = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i]!; const [x2, y2] = ring[i + 1]!;
        const cross = x1 * y2 - x2 * y1;
        area += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
      }
      area /= 2;
      return area ? [cx / (6 * area), cy / (6 * area)] : ring[0]!;
    })();

    // Case 1 — single-floor route (origin == destination).
    if (isOriginFloor && isDestFloor && destCentroid) {
      return findPath(userAnchor.coordinates, destCentroid, navGrid) ?? undefined;
    }

    // Case 2 — leg A: entrance → escalator on origin floor.
    if (isOriginFloor && !isDestFloor && vp) {
      return findPath(userAnchor.coordinates, vp, navGrid) ?? undefined;
    }

    // Case 3 — leg B: escalator → shop on destination floor.
    if (isDestFloor && !isOriginFloor && vp && destCentroid) {
      return findPath(vp, destCentroid, navGrid) ?? undefined;
    }

    // Intermediate floor that's neither origin nor destination — nothing
    // to draw here.
    return undefined;
  }, [routeVisible, userAnchor, routeDestinationShopId, floorGeoJSON, navGrid, destShop]);

  // Visual escalator pin at the central vertical point, only when the
  // active route is cross-floor. Tells the user "this is where you
  // change floors" — and is the same lng/lat on every floor so it
  // anchors leg-A and leg-B in space.
  const escalatorMarker = useMemo<{
    coordinates: [number, number];
    direction:   'up' | 'down';
    targetLabel: string;
    onClick?:    () => void;
  } | null>(() => {
    if (!routeVisible || !destShop || !floorGeoJSON || !floors) return null;
    const active = floors.find((f) => f.id === activeFloorId);
    if (!active) return null;
    const destFloorNum = destShop.floorNumber ?? 0;
    if (destFloorNum === 0) return null; // single-floor route — no escalator needed
    const vp = centralVerticalPoint(floorGeoJSON);
    if (!vp) return null;
    const originFloor = floors.find((f) => f.floorNumber === 0);
    const destFloor   = floors.find((f) => f.id === destShop.floorId);
    if (active.floorNumber === 0 && destFloor) {
      return {
        coordinates: vp,
        direction:   'up',
        targetLabel: destShop.floorName ?? `Level ${destFloorNum}`,
        onClick:     () => setActiveFloor(destFloor.id, destFloor.floorNumber),
      };
    }
    if (active.id === destShop.floorId && originFloor) {
      return {
        coordinates: vp,
        direction:   'down',
        targetLabel: 'Ground',
        onClick:     () => setActiveFloor(originFloor.id, originFloor.floorNumber),
      };
    }
    return null;
  }, [routeVisible, destShop, floorGeoJSON, floors, activeFloorId, setActiveFloor]);

  // Auto-switch the map to the destination floor the moment Directions
  // are triggered for a cross-floor shop. Tracked with a ref so manual
  // floor switches afterwards stick (user can scroll back to floor 0 to
  // review leg A without us yanking them forward again).
  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    if (!routeVisible) { autoSwitchedRef.current = false; return; }
    if (!destShop || !floors || autoSwitchedRef.current) return;
    if (destShop.floorId !== activeFloorId) {
      const target = floors.find((f) => f.id === destShop.floorId);
      if (target) {
        setActiveFloor(target.id, target.floorNumber);
        autoSwitchedRef.current = true;
      }
    } else {
      autoSwitchedRef.current = true;
    }
  }, [routeVisible, destShop, floors, activeFloorId, setActiveFloor]);

  // Bundle the multi-floor leg context for DirectionsPanel — only set
  // when the route actually spans two floors AND the user is currently
  // viewing one of the relevant floors.
  const multiFloorCtx = useMemo(() => {
    if (!routeVisible || !destShop || !floors) return undefined;
    if ((destShop.floorNumber ?? 0) === 0) return undefined; // same as origin
    const originFloor = floors.find((f) => f.floorNumber === 0);
    const destFloor   = floors.find((f) => f.id === destShop.floorId);
    if (!originFloor || !destFloor) return undefined;
    const onOrigin = activeFloorId === originFloor.id;
    const onDest   = activeFloorId === destFloor.id;
    if (!onOrigin && !onDest) return undefined;
    return {
      activeLeg:             (onOrigin ? 'origin' : 'destination') as 'origin' | 'destination',
      originFloorLabel:      originFloor.shortName ?? originFloor.name ?? 'Ground',
      destFloorLabel:        destFloor.shortName   ?? destFloor.name   ?? `L${destFloor.floorNumber}`,
      onSwitchToOrigin:      () => setActiveFloor(originFloor.id, originFloor.floorNumber),
      onSwitchToDestination: () => setActiveFloor(destFloor.id,   destFloor.floorNumber),
    };
  }, [routeVisible, destShop, floors, activeFloorId, setActiveFloor]);

  if (loadingBuilding) return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <BrandedLoader size="lg" label="Loading building…" />
    </div>
  );

  if (!building) return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Building2 className="w-10 h-10 text-ink-200 mb-4 mx-auto" strokeWidth={1.5} />
        <h2 className="text-base font-semibold text-ink-800">Building not found</h2>
        <Link href="/" className="text-primary-600 text-sm mt-3 inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>
    </div>
  );

  const activeFloor = floors?.find((f) => f.id === activeFloorId);

  // Only show the entrance picker when the user taps "Directions" but
  // has no anchor set yet. QR scan is the primary way to set the anchor;
  // the picker is the fallback when no QR was scanned.
  const showPicker =
    routeVisible && !userAnchor &&
    activeFloor?.floorNumber === 0 && entrances.length > 0;

  return (
    <div className="h-full flex overflow-hidden bg-white">

      {/* ── Left panel — shop directory (desktop only; mobile gets a bottom sheet) ── */}
      <div className={`hidden md:flex relative flex-shrink-0 border-r border-gray-100 flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'w-[300px]' : 'w-0 overflow-hidden'}`}>

        {/* Back button (floating above the hero) */}
        <Link
          href="/"
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-card flex items-center justify-center text-ink-700 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        </Link>

        {/* Mall hero */}
        <MallHero
          name={building.name}
          coverPhoto={building.coverPhotoUrl}
          description={building.description}
          shopCount={shops?.length ?? 0}
          floorCount={floors?.length ?? 0}
        />

        {/* Trending strip — the discovery entry point */}
        {shops && shops.length > 0 && <TrendingStrip shops={shops} />}

        {/* Floor tabs */}
        {floors && floors.length > 1 && (
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
              {floors.map((f) => (
                <button key={f.id}
                  onClick={() => setActiveFloor(f.id, f.floorNumber)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${activeFloorId === f.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  {f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shop list */}
        <div className="flex-1 overflow-y-auto border-t border-gray-50">
          <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">All shops</p>
            <span className="text-[10px] text-ink-400 tabular-nums">{shops?.length ?? 0}</span>
          </div>
          {shops?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <Store className="w-8 h-8 text-gray-200 mb-2" strokeWidth={1.5} />
              No shops on this floor
            </div>
          )}
          {shops?.map((shop) => {
            const Icon = CATEGORY_ICON_MAP[shop.category ?? ''] ?? Store;
            const active = selectedShop?.shopId === shop.id;
            return (
              <button
                key={shop.id}
                onClick={() => {
                  mapStore.getState().actions.selectShop({
                    shopId: shop.id, shopName: shop.publicName,
                    unitId: shop.unitId ?? '', unitCode: shop.unitCode ?? '',
                    category: shop.category,
                  });
                }}
                className={`w-full text-left px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors flex items-center gap-3
                  ${active ? 'bg-primary-50/60' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative
                  ${shop.logoUrl ? 'border border-ink-100' : 'bg-primary-50 border border-primary-100 flex items-center justify-center'}`}>
                  {shop.logoUrl ? (
                    <Image src={shop.logoUrl} alt={shop.publicName} fill className="object-cover" sizes="40px" />
                  ) : (
                    <Icon className="w-4 h-4 text-primary-600" strokeWidth={2} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{shop.publicName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{shop.category}</span>
                    {shop.unitCode && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-mono flex-shrink-0">{shop.unitCode}</span>
                    )}
                  </div>
                </div>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer QR scan hint */}
        <div className="px-4 py-3 border-t border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2.5 bg-primary-50 rounded-xl px-3 py-2.5">
            <QrCode className="w-4 h-4 text-primary-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-primary-700 font-medium">Scan a QR code at any entrance for &ldquo;You are here&rdquo;</p>
          </div>
        </div>
      </div>

      {/* ── Map area ── */}
      <div className="flex-1 relative min-w-0">

        {/* Top search bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-3 sm:px-4 py-3 glass">
          {/* Back button on mobile, sidebar toggle on desktop */}
          <Link href="/" className="md:hidden w-9 h-9 rounded-xl bg-white border border-ink-100 shadow-card flex items-center justify-center text-ink-500 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-card items-center justify-center text-gray-500 hover:border-gray-300 flex-shrink-0 transition-colors">
            <Menu className="w-4 h-4" strokeWidth={2} />
          </button>
          <SearchBar buildingId={building.id} />
        </div>

        {/* Search-results banner — visible while highlights are painted */}
        {searchHighlights.length > 0 && (
          <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink-200 shadow-card text-[12px]">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-ink-900 font-bold">{searchHighlights.length}</span>
            <span className="text-ink-500">match{searchHighlights.length === 1 ? '' : 'es'} for</span>
            <span className="text-ink-900 font-semibold">&ldquo;{searchHighlightLabel}&rdquo;</span>
            <button
              onClick={() => clearSearchHighlights()}
              className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-ink-100 text-ink-400 hover:text-ink-700"
              aria-label="Clear search highlights"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Map */}
        <div className="absolute inset-0 pt-[57px]">
          {activeFloorId && floorGeoJSON ? (
            <MapCanvas
              floorGeoJSON={floorGeoJSON}
              buildingLat={Number(building.lat ?? -1.9442)}
              buildingLng={Number(building.lng ?? 30.0599)}
              entrances={activeFloor?.floorNumber === 0 ? entrances : []}
              userAnchorCoordinates={
                activeFloor?.floorNumber === 0 ? userAnchor?.coordinates : undefined
              }
              routeCoordinates={routeCoordinates}
              escalatorMarker={escalatorMarker}
              searchHighlights={searchHighlights}
              onMapReady={(m) => { mapRef.current = m; }}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full bg-slate-50 flex items-center justify-center">
              {loadingMap
                ? <BrandedLoader size="md" label="Loading floor…" />
                : <p className="text-sm text-gray-400">Select a floor to view the map</p>
              }
            </div>
          )}
        </div>

        {/* "Your entrance" badge — visible on every floor once picked */}
        {userAnchor && (
          <button
            onClick={() => setPickerDismissed(false)}
            className="absolute top-[68px] left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white shadow-card border border-ink-100 text-[11px] font-semibold text-ink-700 hover:border-primary-200 transition-colors"
            title="Change entrance"
          >
            <DoorOpen className="w-3 h-3 text-primary-600" strokeWidth={2.5} />
            <span>You: {userAnchor.label}</span>
          </button>
        )}

        {/* First-visit entrance picker overlay */}
        {showPicker && (
          <EntrancePicker
            buildingName={building.name}
            entrances={entrances}
            onPicked={() => {}}
            onClose={() => clearRoute()}
          />
        )}

        {/* Floor selector */}
        {floors && floors.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/4 z-10">
            <FloorSelector floors={floors} />
          </div>
        )}

        {/* Rotate controls — discoverable on every device. */}
        <div className="absolute right-4 top-[72px] z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => rotateBy(-45)}
            title="Rotate left"
            className="w-9 h-9 rounded-xl bg-white shadow-card border border-ink-100 flex items-center justify-center text-ink-700 hover:bg-ink-50 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset view (north up)"
            className="w-9 h-9 rounded-xl bg-white shadow-card border border-ink-100 flex items-center justify-center text-primary-700 font-extrabold text-[11px] hover:bg-ink-50 active:scale-95 transition-all"
          >
            N
          </button>
          <button
            type="button"
            onClick={() => rotateBy(45)}
            title="Rotate right"
            className="w-9 h-9 rounded-xl bg-white shadow-card border border-ink-100 flex items-center justify-center text-ink-700 hover:bg-ink-50 active:scale-95 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Bottom building badge */}
        <div className="absolute bottom-6 left-4 z-10">
          <div className="glass rounded-2xl px-4 py-2.5 shadow-float">
            <p className="text-xs font-bold text-gray-900">{building.name}</p>
            {activeFloor && <p className="text-xs text-gray-400 mt-0.5">{activeFloor.name}</p>}
          </div>
        </div>

        {/* Directions panel takes priority when "Guide Me There" was tapped;
            otherwise fall back to the shop info panel. */}
        {routeVisible && selectedShop ? (
          <DirectionsPanel
            shopId={selectedShop.shopId}
            routeCoordinates={routeCoordinates}
            multiFloor={multiFloorCtx}
          />
        ) : selectedShop ? (
          <ShopPanel shopId={selectedShop.shopId} />
        ) : null}

        {/* ───── Mobile-only: bottom-sheet directory ───────────────────────── */}
        {/* The peek chip (always visible on mobile) */}
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className={`md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-lg border border-ink-100 transition-opacity ${selectedShop ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Store className="w-4 h-4 text-primary-600" strokeWidth={2} />
          <span className="text-sm font-semibold text-ink-900">
            {shops?.length ?? 0} shops {activeFloor ? `· ${activeFloor.name}` : ''}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-ink-400" strokeWidth={2.5} />
        </button>

        {/* The actual sheet (expanded) */}
        {mobileSheetOpen && (
          <div className="md:hidden absolute inset-x-0 bottom-0 z-40 max-h-[75vh] flex flex-col bg-white rounded-t-3xl shadow-2xl border-t border-ink-100">
            {/* Drag handle */}
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="pt-3 pb-2 flex items-center justify-center"
              aria-label="Close directory"
            >
              <span className="w-10 h-1 rounded-full bg-ink-200" />
            </button>

            {/* Sheet header */}
            <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-ink-900">{building.name}</p>
                <p className="text-xs text-ink-500">{shops?.length ?? 0} shops · {activeFloor?.name}</p>
              </div>
              <button onClick={() => setMobileSheetOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Floor tabs (compact) */}
            {floors && floors.length > 1 && (
              <div className="mx-5 mb-3 flex gap-1 bg-ink-50 rounded-xl p-1 flex-shrink-0">
                {floors.map((f) => (
                  <button key={f.id}
                    onClick={() => setActiveFloor(f.id, f.floorNumber)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${activeFloorId === f.id ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`}>
                    {f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Trending strip (mobile) */}
            {shops && shops.length > 0 && (
              <div className="px-2 flex-shrink-0">
                <TrendingStrip shops={shops} />
              </div>
            )}

            {/* Shop list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {!shops?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-ink-400 text-sm">
                  <Store className="w-7 h-7 text-ink-200 mb-2" strokeWidth={1.5} />
                  No shops on this floor
                </div>
              ) : shops.map((shop) => {
                const Icon = CATEGORY_ICON_MAP[shop.category ?? ''] ?? Store;
                const active = selectedShop?.shopId === shop.id;
                return (
                  <button
                    key={shop.id}
                    onClick={() => {
                      mapStore.getState().actions.selectShop({
                        shopId: shop.id, shopName: shop.publicName,
                        unitId: shop.unitId ?? '', unitCode: shop.unitCode ?? '',
                        category: shop.category,
                      });
                      setMobileSheetOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 border-b border-ink-50 last:border-0 flex items-center gap-3 active:bg-ink-50
                      ${active ? 'bg-primary-50' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative
                      ${shop.logoUrl ? 'border border-ink-100' : 'bg-primary-50 border border-primary-100 flex items-center justify-center'}`}>
                      {shop.logoUrl ? (
                        <Image src={shop.logoUrl} alt={shop.publicName} fill className="object-cover" sizes="40px" />
                      ) : (
                        <Icon className="w-4 h-4 text-primary-600" strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 truncate">{shop.publicName}</p>
                      <p className="text-[11px] text-ink-500 truncate">
                        {shop.category}{shop.unitCode && ` · ${shop.unitCode}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
