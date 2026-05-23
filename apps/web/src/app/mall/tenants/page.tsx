'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Loader2, ArrowRight, Briefcase,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const BUILDING_SLUG = 'chic-kigali';

const CATEGORIES = [
  'Fashion & Apparel', 'Food & Beverages', 'Electronics', 'Health & Pharmacy',
  'Banking & Finance', 'Beauty & Cosmetics', 'Sports & Fitness', 'Entertainment',
];

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'gray' | 'red'; label: string }> = {
  verified:        { variant: 'green', label: 'Verified'        },
  needs_review:    { variant: 'amber', label: 'Needs review'    },
  unverified:      { variant: 'gray',  label: 'Unverified'      },
  reported_wrong:  { variant: 'red',   label: 'Reported wrong'  },
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

function avatarColor(name: string): string {
  const palette = ['bg-primary-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length]!;
}

function fmtMoney(n: number | null, currency = 'RWF'): string {
  if (n == null) return '—';
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TenantsPage() {
  const [search,   setSearch]   = useState('');
  const [floorId,  setFloorId]  = useState<string | 'all'>('all');
  const router = useRouter();

  // Legacy deep-link: /mall/tenants?assign=1[&unitId=…] now redirects to the
  // full wizard at /mall/tenants/assign instead of opening a drawer.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('assign') === '1') {
      const unitId = params.get('unitId');
      const target = unitId ? `/mall/tenants/assign?unitId=${unitId}` : '/mall/tenants/assign';
      router.replace(target);
    }
  }, [router]);

  const { data: building } = trpc.buildings.bySlug.useQuery({ slug: BUILDING_SLUG });
  const { data: floors }   = trpc.buildings.floors.useQuery(
    { buildingId: building?.id ?? '' }, { enabled: !!building?.id },
  );

  const { data: tenants, isLoading } = trpc.tenants.list.useQuery(
    { buildingId: building?.id, search: search || undefined },
    { enabled: !!building?.id },
  );

  const { data: summary } = trpc.tenants.summary.useQuery(
    { buildingId: building?.id ?? '' }, { enabled: !!building?.id },
  );

  const filtered = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter((t) => floorId === 'all' || t.floorId === floorId);
  }, [tenants, floorId]);


  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Tenants</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            {summary
              ? `${summary.tenants} tenants · ${fmtMoney(summary.monthlyRent)}/mo collected`
              : (isLoading ? 'Loading…' : '0 tenants')}
          </p>
        </div>
        <Link href="/mall/tenants/assign" className="btn-primary text-xs py-1.5">
          <Plus className="w-3.5 h-3.5" /> Assign tenant to unit
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, or unit code…"
            className="input-base pl-9"
          />
        </div>
        <div className="flex items-center bg-white border border-ink-200 rounded-lg p-1 gap-0.5">
          <button onClick={() => setFloorId('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
              ${floorId === 'all' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
            All
          </button>
          {floors?.map((f) => (
            <button key={f.id} onClick={() => setFloorId(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                ${floorId === f.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
              {f.shortName ?? (f.floorNumber === 0 ? 'G' : `L${f.floorNumber}`)}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-400 font-medium">{filtered.length} results</span>
      </div>

      {/* Content */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="card overflow-hidden flex-1 min-w-0">
          {isLoading ? (
            <div className="px-6 py-16 text-center">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin mx-auto" />
              <p className="text-xs text-ink-400 mt-3">Loading tenants…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/40">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-widest">Tenant</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-widest hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-widest hidden lg:table-cell">Unit</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-widest hidden xl:table-cell">Rent / mo</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-ink-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const badge = t.verificationStatus ? STATUS_BADGE[t.verificationStatus] : null;
                  return (
                    <tr
                      key={t.tenantId}
                      onClick={() => router.push(`/mall/tenants/${t.tenantId}`)}
                      className="border-b border-ink-50 last:border-0 cursor-pointer hover:bg-ink-50/50"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${avatarColor(t.tradeName ?? t.publicName ?? '?')} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                            {initials(t.tradeName ?? t.publicName ?? '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-900 truncate">{t.tradeName ?? t.publicName ?? '—'}</p>
                            <p className="text-[11px] text-ink-400 truncate">{t.legalName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-ink-600">{t.category ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs font-semibold text-ink-900">{t.unitCode}</span>
                        <span className="text-[11px] text-ink-400 ml-1.5">{t.floorName}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-right">
                        <span className="text-xs tabular-nums font-semibold text-ink-900">
                          {fmtMoney(t.monthlyRent, t.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {badge && <Badge variant={badge.variant} dot>{badge.label}</Badge>}
                      </td>
                      <td className="pr-4">
                        <ArrowRight className="w-3.5 h-3.5 text-ink-300" strokeWidth={2} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-ink-100 mx-auto flex items-center justify-center mb-4">
        <Briefcase className="w-5 h-5 text-ink-400" strokeWidth={2} />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">No tenants yet</h3>
      <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto">
        Lease your first vacant unit to a tenant — it will create the lease record, the shop profile, an e-contract, and mark the unit as occupied.
      </p>
      <Link href="/mall/tenants/assign" className="btn-primary text-xs py-2 mt-5 inline-flex">
        <Plus className="w-3.5 h-3.5" /> Assign a tenant
      </Link>
    </div>
  );
}
