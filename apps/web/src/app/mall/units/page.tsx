'use client';

import { useState, useEffect } from 'react';
import {
  Layers, LayoutGrid, Download, Maximize2,
  AlertCircle, X, Pencil, Clock, Search,
  Laptop2, Shirt, Utensils, Pill, Banknote,
  Sparkles, Dumbbell, Clapperboard, Store,
  Ruler, Coins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { UnitFeatureProperties } from '@mallguide/shared';
import { Badge } from '@/components/ui/Badge';
import { BrandedLoader } from '@/components/ui/BrandedLoader';
import { FloorPlanViewer, FloorPlanLegend, type ViewMode as FloorPlanViewMode } from '@/components/mall/FloorPlanViewer';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUILDING_SLUG = 'chic-kigali';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  'Electronics':        Laptop2,
  'Fashion & Apparel':  Shirt,
  'Food & Beverages':   Utensils,
  'Health & Pharmacy':  Pill,
  'Banking & Finance':  Banknote,
  'Beauty & Cosmetics': Sparkles,
  'Sports & Fitness':   Dumbbell,
  'Entertainment':      Clapperboard,
};

const STATUS_COLORS = {
  occupied:    { badge: 'green'  as const, bar: 'bg-[#4ade80]' },
  vacant:      { badge: 'gray'   as const, bar: 'bg-[#e2e8f0]' },
  reserved:    { badge: 'amber'  as const, bar: 'bg-[#fbbf24]' },
  maintenance: { badge: 'red'    as const, bar: 'bg-[#f87171]' },
};

const STATUS_CHIPS: ReadonlyArray<{ key: 'occupied' | 'vacant' | 'reserved' | 'maintenance'; label: string; dot: string }> = [
  { key: 'occupied',    label: 'Occupied',    dot: 'bg-[#4ade80]' },
  { key: 'vacant',      label: 'Vacant',      dot: 'bg-[#94a3b8]' },
  { key: 'reserved',    label: 'Reserved',    dot: 'bg-[#fbbf24]' },
  { key: 'maintenance', label: 'Maintenance', dot: 'bg-[#f87171]' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FloorMapsPage() {
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [viewMode,      setViewMode]      = useState<FloorPlanViewMode>('status');
  const [selected,      setSelected]      = useState<UnitFeatureProperties | null>(null);
  const [searchInput,   setSearchInput]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState<ReadonlyArray<string>>([]);

  const { data: building } = trpc.buildings.bySlug.useQuery({ slug: BUILDING_SLUG });

  const { data: floors } = trpc.buildings.floors.useQuery(
    { buildingId: building?.id ?? '' },
    { enabled: !!building?.id },
  );

  useEffect(() => {
    if (floors?.length && !activeFloorId) setActiveFloorId(floors[0]!.id);
  }, [floors, activeFloorId]);

  // Debounce the search input so we don't refit the viewport on every keystroke.
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const trimmed = searchInput.trim();
    const timer = setTimeout(() => setSearchQuery(trimmed), 180);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function toggleStatusChip(status: string) {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  }

  function clearFilters() {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter([]);
  }

  const hasActiveFilter = searchQuery.length > 0 || statusFilter.length > 0;

  const resolvedFloorId = activeFloorId ?? floors?.[0]?.id ?? null;

  const { data: floorGeoJSON, isLoading } = trpc.map.floorGeoJSON.useQuery(
    { floorId: resolvedFloorId ?? '' },
    { enabled: !!resolvedFloorId, staleTime: 60_000 },
  );

  const features     = floorGeoJSON?.units.features ?? [];
  const totalUnits   = features.length;
  const countByStatus = features.reduce<Record<string, number>>((acc, f) => {
    const s = (f.properties?.status as string) ?? 'unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const occupied      = countByStatus['occupied']    ?? 0;
  const vacant        = countByStatus['vacant']      ?? 0;
  const reserved      = countByStatus['reserved']    ?? 0;
  const maintenance   = countByStatus['maintenance'] ?? 0;
  const occupancyPct  = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;

  const catBreakdown = features
    .filter((f) => f.properties?.status === 'occupied' && f.properties?.category)
    .reduce<Record<string, number>>((acc, f) => {
      const c = f.properties!.category!;
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});
  const topCats = Object.entries(catBreakdown).sort(([, a], [, b]) => b - a);

  const activeFloor = floors?.find((f) => f.id === resolvedFloorId);

  const currency  = floorGeoJSON?.currency ?? 'RWF';
  const ratePerSqm = floorGeoJSON?.pricePerSqm ?? null;
  const fmtMoney  = (n: number) => `${currency} ${Math.round(n).toLocaleString()}`;

  // Aggregate area + revenue stats across the floor's units
  const totalAreaSqm = features.reduce(
    (sum, f) => sum + (f.properties?.areaSqm ?? 0),
    0,
  );
  const occupiedRentTotal = features.reduce(
    (sum, f) => sum + (f.properties?.status === 'occupied' ? (f.properties?.monthlyRent ?? 0) : 0),
    0,
  );
  const potentialRentTotal = ratePerSqm
    ? features.reduce(
        (sum, f) => sum + (f.properties?.areaSqm ?? 0) * ratePerSqm,
        0,
      )
    : 0;

  function handleFloorChange(id: string) {
    setActiveFloorId(id);
    setSelected(null);
  }

  function handleUnitClick(props: UnitFeatureProperties) {
    setSelected(selected?.id === props.id ? null : props);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-ink-900">Property Plan</h1>
            <p className="text-xs text-ink-400 mt-0.5">
              {building?.name ?? '…'} · {floors?.length ?? 0} floors · {totalUnits} units · {occupancyPct}% occupied
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs py-1.5">
              <Download   className="w-3.5 h-3.5" /> Export
            </button>
            <button className="btn-secondary text-xs py-1.5">
              <Maximize2  className="w-3.5 h-3.5" /> Full screen
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {floors && (
            <div className="flex bg-white border border-ink-200 rounded-lg p-1 gap-0.5">
              {floors.map((f) => {
                const label  = f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`);
                const active = f.id === resolvedFloorId;
                return (
                  <button key={f.id}
                    onClick={() => handleFloorChange(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                      ${active ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex bg-white border border-ink-200 rounded-lg p-1 gap-0.5">
            {([
              { k: 'status'  as const, icon: Layers,      label: 'Lease status' },
              { k: 'category'as const, icon: LayoutGrid,  label: 'Category'     },
            ]).map(({ k, icon: Icon, label }) => (
              <button key={k}
                onClick={() => setViewMode(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${viewMode === k ? 'bg-primary-600 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
                <Icon className="w-3 h-3" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          <FloorPlanLegend viewMode={viewMode} />

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Find shop, unit code, category…"
                className="pl-8 pr-3 py-1.5 w-64 border border-ink-200 rounded-lg text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-ink-400 hover:bg-ink-100"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {STATUS_CHIPS.map((chip) => {
                const active = statusFilter.includes(chip.key);
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => toggleStatusChip(chip.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors
                      ${active
                        ? 'bg-ink-900 text-white border-ink-900'
                        : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300 hover:bg-ink-50'}`}
                  >
                    <span className={`w-2 h-2 rounded-sm ${chip.dot}`} />
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-semibold text-ink-500 hover:text-ink-800 px-2 py-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main: map + sidebar ── */}
      <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0 overflow-hidden">

        {/* Floor plan */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex-1 bg-slate-100 rounded-xl border border-ink-200 flex items-center justify-center">
              <BrandedLoader size="lg" label="Loading floor plan…" />
            </div>
          ) : floorGeoJSON ? (
            <FloorPlanViewer
              floorGeoJSON={floorGeoJSON}
              viewMode={viewMode}
              selectedUnitId={selected?.id ?? null}
              onUnitClick={handleUnitClick}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              className="flex-1"
            />
          ) : (
            <div className="flex-1 bg-slate-50 rounded-xl border border-dashed border-ink-200 flex items-center justify-center">
              <p className="text-sm text-ink-400">Select a floor to view the plan</p>
            </div>
          )}

          {/* Info bar */}
          {floorGeoJSON && (
            <div className="flex-shrink-0 bg-white border border-ink-100 rounded-xl px-5 py-2.5 flex items-center gap-5 text-xs">
              <span className="font-bold text-ink-800">{floorGeoJSON.floorName}</span>
              <div className="h-6 w-px bg-ink-100" />
              {[
                { label: 'Units',     val: totalUnits,     color: 'text-ink-900' },
                { label: 'Occupied',  val: `${occupied} (${occupancyPct}%)`, color: occupied === totalUnits ? 'text-success-700' : 'text-ink-900' },
                { label: 'Vacant',    val: vacant,          color: vacant ? 'text-warning-700' : 'text-ink-900' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="text-ink-400">{s.label}:</span>
                  <span className={`font-bold tabular-nums ${s.color}`}>{s.val}</span>
                </div>
              ))}
              <span className="ml-auto text-ink-300 text-[10px]">
                v{floorGeoJSON.version} · Click a unit to inspect
              </span>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Selected unit */}
          {selected ? (
            <div className="card overflow-hidden flex-shrink-0">
              <div className="card-header py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-900 font-mono">{selected.unitCode}</p>
                  <p className="text-[10px] text-ink-400">{activeFloor?.name}</p>
                </div>
                <button onClick={() => setSelected(null)}
                  className="w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:bg-ink-100 flex-shrink-0">
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <div className="px-4 py-4">
                {selected.shopName ? (
                  <div className="flex items-start gap-3 mb-4">
                    {(() => {
                      const Icon = CATEGORY_ICON[selected.category ?? ''] ?? Store;
                      return (
                        <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4.5 h-4.5 text-primary-600" style={{ width: 18, height: 18 }} strokeWidth={2} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{selected.shopName}</p>
                      {selected.category && (
                        <p className="text-[10px] text-ink-400">{selected.category}</p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-0 divide-y divide-ink-50 text-xs mb-4">
                  <Row l="Status" v={
                    <Badge variant={STATUS_COLORS[selected.status as keyof typeof STATUS_COLORS]?.badge ?? 'gray'} dot>
                      {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                    </Badge>
                  } />
                  <Row l="Unit" v={<span className="font-mono font-semibold">{selected.unitCode}</span>} />
                  <Row l="Floor" v={activeFloor?.name ?? '–'} />
                  {selected.areaSqm != null && (
                    <Row l="Area" v={<span className="tabular-nums">{selected.areaSqm.toFixed(1)} m²</span>} />
                  )}
                  {ratePerSqm != null && (
                    <Row l="Rate" v={<span className="tabular-nums">{fmtMoney(ratePerSqm)} / m²</span>} />
                  )}
                  {ratePerSqm != null && selected.areaSqm != null && (
                    <Row
                      l={selected.status === 'occupied' ? 'Asking' : 'Potential'}
                      v={<span className="font-bold tabular-nums">{fmtMoney(selected.areaSqm * ratePerSqm)} /mo</span>}
                    />
                  )}
                  {selected.status === 'occupied' && selected.monthlyRent != null && (
                    <Row
                      l="Paid rent"
                      v={
                        <span className="font-bold tabular-nums text-success-700">
                          {fmtMoney(selected.monthlyRent)} /mo
                        </span>
                      }
                    />
                  )}
                  {selected.status === 'occupied' && selected.tenantTradeName && (
                    <Row l="Tenant" v={<span className="font-semibold text-ink-800">{selected.tenantTradeName}</span>} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {selected.status === 'vacant' ? (
                    <a
                      href={`/mall/tenants/assign?unitId=${selected.id}`}
                      className="btn-primary text-xs py-1.5 justify-center col-span-2"
                    >
                      Assign tenant
                    </a>
                  ) : selected.tenantId ? (
                    <>
                      <a
                        href={`/mall/tenants/${selected.tenantId}`}
                        className="btn-primary text-xs py-1.5 justify-center"
                      >
                        Open tenant
                      </a>
                      <button className="btn-secondary text-xs py-1.5 justify-center">
                        <Clock className="w-3 h-3" /> History
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-primary text-xs py-1.5 justify-center">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button className="btn-secondary text-xs py-1.5 justify-center">
                        <Clock className="w-3 h-3" /> History
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card px-4 py-3 text-center text-[11px] text-ink-400 flex-shrink-0">
              Click a unit on the plan
            </div>
          )}

          {/* Pricing summary */}
          {ratePerSqm != null && (
            <div className="card overflow-hidden flex-shrink-0">
              <div className="card-header py-3">
                <h3 className="text-xs font-semibold text-ink-900 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
                  Pricing — {activeFloor?.shortName ?? activeFloor?.name ?? 'this floor'}
                </h3>
              </div>
              <div className="px-4 py-3 space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-500">Rate / m²</span>
                  <span className="font-bold text-ink-900 tabular-nums">{fmtMoney(ratePerSqm)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-500 flex items-center gap-1">
                    <Ruler className="w-3 h-3" strokeWidth={2} /> Leasable area
                  </span>
                  <span className="font-semibold text-ink-800 tabular-nums">
                    {Math.round(totalAreaSqm).toLocaleString()} m²
                  </span>
                </div>
                <div className="h-px bg-ink-100 my-1" />
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-500">Collected</span>
                  <span className="font-semibold text-ink-800 tabular-nums">
                    {fmtMoney(occupiedRentTotal)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-500">Potential</span>
                  <span className="font-semibold text-ink-800 tabular-nums">
                    {fmtMoney(potentialRentTotal)}
                  </span>
                </div>
                {potentialRentTotal > 0 && (
                  <div className="pt-1">
                    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${Math.min(100, (occupiedRentTotal / potentialRentTotal) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-ink-400 tabular-nums">
                      {Math.round((occupiedRentTotal / potentialRentTotal) * 100)}% of potential
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Occupancy */}
          <div className="card overflow-hidden flex-shrink-0">
            <div className="card-header py-3">
              <h3 className="text-xs font-semibold text-ink-900">Occupancy</h3>
              <span className="text-xs font-bold text-ink-900">{occupancyPct}%</span>
            </div>
            <div className="px-4 py-4">
              <div className="h-2.5 rounded-full overflow-hidden flex gap-px mb-3">
                {occupied    > 0 && <div className="bg-primary-400 rounded-full" style={{ flex: occupied    }} />}
                {reserved    > 0 && <div className="bg-warning-400 rounded-full" style={{ flex: reserved    }} />}
                {maintenance > 0 && <div className="bg-danger-400  rounded-full" style={{ flex: maintenance }} />}
                {vacant      > 0 && <div className="bg-ink-200     rounded-full" style={{ flex: vacant      }} />}
              </div>
              <div className="space-y-2 text-xs">
                {(Object.entries({
                  occupied: { label: 'Occupied', color: 'bg-primary-400', n: occupied },
                  reserved: { label: 'Reserved', color: 'bg-warning-400', n: reserved },
                  maintenance: { label: 'Maintenance', color: 'bg-danger-400', n: maintenance },
                  vacant: { label: 'Vacant', color: 'bg-ink-200', n: vacant },
                }) as [string, { label: string; color: string; n: number }][])
                  .filter(([, v]) => v.n > 0)
                  .map(([, v]) => (
                  <div key={v.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${v.color}`} />
                      <span className="text-ink-500">{v.label}</span>
                    </div>
                    <span className="font-bold text-ink-900 tabular-nums">{v.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category mix */}
          {topCats.length > 0 && (
            <div className="card overflow-hidden flex-shrink-0">
              <div className="card-header py-3">
                <h3 className="text-xs font-semibold text-ink-900">Category mix</h3>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {topCats.map(([cat, n]) => {
                  const Icon = CATEGORY_ICON[cat] ?? Store;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-ink-700 truncate font-medium">{cat}</p>
                        <div className="h-1 bg-ink-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-primary-400 rounded-full"
                               style={{ width: `${(n / occupied) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-ink-900 flex-shrink-0 tabular-nums">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vacant alert */}
          {vacant > 0 && (
            <div className="bg-warning-50 border border-warning-100 rounded-xl px-4 py-3 flex-shrink-0">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-xs text-warning-700 font-medium leading-relaxed">
                  {vacant} vacant unit{vacant > 1 ? 's' : ''} on this floor.
                  Check failed searches for leasing signals.
                </p>
              </div>
            </div>
          )}

          {/* All floors */}
          {floors && floors.length > 1 && (
            <div className="card overflow-hidden flex-shrink-0">
              <div className="card-header py-3">
                <h3 className="text-xs font-semibold text-ink-900">All floors</h3>
              </div>
              <div className="px-3 py-2 space-y-0.5">
                {floors.map((f) => {
                  const label  = f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`);
                  const active = f.id === resolvedFloorId;
                  return (
                    <button key={f.id}
                      onClick={() => handleFloorChange(f.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors
                        ${active ? 'bg-ink-900 text-white' : 'hover:bg-ink-50 text-ink-600'}`}>
                      <span className="font-semibold">{label} — {f.name}</span>
                      {active && <span className="text-[10px] text-white/50">active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-ink-400">{l}</span>
      <span className="text-ink-800 font-medium">{v}</span>
    </div>
  );
}
