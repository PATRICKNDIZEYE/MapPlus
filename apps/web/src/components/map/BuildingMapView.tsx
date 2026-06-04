'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useMapActions, useActiveFloorId, useSelectedShop, useRouteVisible, useMapStore, useMapStore as mapStore } from '@/store/map.store';
import { FloorSelector } from './FloorSelector';
import { SearchBar } from '@/components/search/SearchBar';
import { ShopPanel } from './ShopPanel';
import { DirectionsPanel } from './DirectionsPanel';
import { MallHero } from './MallHero';
import { TrendingStrip } from './TrendingStrip';
import {
  ArrowLeft, Menu, QrCode, Building2, ChevronUp, X,
  Laptop2, Shirt, Utensils, Pill, Banknote, Sparkles, Dumbbell, Clapperboard, Store,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  'Electronics': Laptop2, 'Fashion & Apparel': Shirt,   'Food & Beverages':   Utensils,
  'Health & Pharmacy': Pill, 'Banking & Finance': Banknote, 'Beauty & Cosmetics': Sparkles,
  'Sports & Fitness': Dumbbell, 'Entertainment': Clapperboard,
};

const MapCanvas = dynamic(() => import('./MapCanvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />,
});


interface BuildingMapViewProps {
  buildingSlug: string;
  initialFloorId?: string;
  fromAnchorId?: string;
}

export function BuildingMapView({ buildingSlug, initialFloorId }: BuildingMapViewProps) {
  const { setActiveBuilding, setActiveFloor } = useMapActions();
  const activeFloorId = useActiveFloorId();
  const selectedShop  = useSelectedShop();
  const routeVisible  = useRouteVisible();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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

  if (loadingBuilding) return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading building...</p>
      </div>
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

        {/* Map */}
        <div className="absolute inset-0 pt-[57px]">
          {activeFloorId && floorGeoJSON ? (
            <MapCanvas
              floorGeoJSON={floorGeoJSON}
              buildingLat={Number(building.lat ?? -1.9442)}
              buildingLng={Number(building.lng ?? 30.0599)}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full bg-slate-50 flex items-center justify-center">
              {loadingMap
                ? <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                : <p className="text-sm text-gray-400">Select a floor to view the map</p>
              }
            </div>
          )}
        </div>

        {/* Floor selector */}
        {floors && floors.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/4 z-10">
            <FloorSelector floors={floors} />
          </div>
        )}

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
          <DirectionsPanel shopId={selectedShop.shopId} />
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
