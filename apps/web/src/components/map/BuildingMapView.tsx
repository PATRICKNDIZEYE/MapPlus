'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useMapActions, useActiveFloorId, useSelectedShop, useMapStore, useMapStore as mapStore } from '@/store/map.store';
import { FloorSelector } from './FloorSelector';
import { SearchBar } from '@/components/search/SearchBar';
import { ShopPanel } from './ShopPanel';
import {
  ArrowLeft, Menu, QrCode, MapPin,
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

      {/* ── Left panel — shop directory ── */}
      <div className={`flex-shrink-0 border-r border-gray-100 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`}>

        {/* Panel header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{building.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{shops?.length ?? 0} shops</p>
            </div>
            <Link href="/" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>

          {/* Floor tabs */}
          {floors && (
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
          )}
        </div>

        {/* Shop list */}
        <div className="flex-1 overflow-y-auto">
          {shops?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <Store className="w-8 h-8 text-gray-200 mb-2" strokeWidth={1.5} />
              No shops on this floor
            </div>
          )}
          {shops?.map((shop) => (
            <button
              key={shop.id}
              onClick={() => {
                mapStore.getState().actions.selectShop({
                  shopId: shop.id, shopName: shop.publicName,
                  unitId: shop.unitId ?? '', unitCode: shop.unitCode ?? '',
                  category: shop.category,
                });
              }}
              className={`w-full text-left px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors flex items-center gap-3
                ${selectedShop?.shopId === shop.id ? 'bg-brand-50 border-brand-100' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                {(() => { const Icon = CATEGORY_ICON_MAP[shop.category ?? ''] ?? Store; return <Icon className="w-4 h-4 text-blue-600" strokeWidth={2} />; })()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{shop.publicName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400 truncate">{shop.category}</span>
                  {shop.unitCode && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-mono flex-shrink-0">{shop.unitCode}</span>
                  )}
                </div>
              </div>
              {selectedShop?.shopId === shop.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Footer QR scan hint */}
        <div className="px-4 py-3 border-t border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2.5 bg-blue-50 rounded-xl px-3 py-2.5">
            <QrCode className="w-4 h-4 text-blue-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-blue-700 font-medium">Scan a QR code at any entrance for &ldquo;You are here&rdquo;</p>
          </div>
        </div>
      </div>

      {/* ── Map area ── */}
      <div className="flex-1 relative min-w-0">

        {/* Top search bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-4 py-3 glass">
          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-card flex items-center justify-center text-gray-500 hover:border-gray-300 flex-shrink-0 transition-colors">
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

        {/* Shop panel */}
        {selectedShop && <ShopPanel shopId={selectedShop.shopId} />}
      </div>
    </div>
  );
}
