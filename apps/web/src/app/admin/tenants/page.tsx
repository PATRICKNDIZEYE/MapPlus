'use client';

import { useState } from 'react';
import { Search, Plus, X, Pencil, Map } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// initials from trade name — two characters, uppercase
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

// deterministic hue from string so same tenant always gets same color
function avatarColor(name: string): string {
  const palette = [
    'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
    'bg-amber-600', 'bg-rose-600',  'bg-cyan-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length]!;
}

const TENANTS = [
  { id:  1, name: 'MTN MoMo Corner',   category: 'Banking & Finance',  unit: 'G-A01',  floor: 'G',  status: 'verified',     since: 'Jan 2025', phone: '+250 788 123 001', rent: '450,000' },
  { id:  2, name: 'Simba Sports',       category: 'Sports & Fitness',   unit: 'G-A02',  floor: 'G',  status: 'verified',     since: 'Mar 2024', phone: '+250 788 123 002', rent: '380,000' },
  { id:  3, name: 'Royal Pharmacy',     category: 'Health & Pharmacy',  unit: 'G-A03',  floor: 'G',  status: 'verified',     since: 'Jun 2023', phone: '+250 788 123 003', rent: '520,000' },
  { id:  4, name: 'KFC CHIC',           category: 'Food & Beverages',   unit: 'G-A04',  floor: 'G',  status: 'needs_review', since: 'Jan 2024', phone: '+250 788 123 004', rent: '780,000' },
  { id:  5, name: 'Airtel Money',       category: 'Banking & Finance',  unit: 'G-B01',  floor: 'G',  status: 'verified',     since: 'Sep 2023', phone: '+250 788 123 005', rent: '420,000' },
  { id:  6, name: 'iStore Rwanda',      category: 'Electronics',        unit: 'L1-A01', floor: 'L1', status: 'verified',     since: 'Feb 2024', phone: '+250 788 123 010', rent: '690,000' },
  { id:  7, name: 'Nakumatt Fashion',   category: 'Fashion & Apparel',  unit: 'L1-A02', floor: 'L1', status: 'verified',     since: 'Apr 2024', phone: '+250 788 123 011', rent: '430,000' },
  { id:  8, name: 'Dove Beauty',        category: 'Beauty & Cosmetics', unit: 'L1-A03', floor: 'L1', status: 'unverified',   since: 'Jul 2025', phone: '+250 788 123 012', rent: '360,000' },
  { id:  9, name: 'The Book Cafe',      category: 'Food & Beverages',   unit: 'L1-A04', floor: 'L1', status: 'verified',     since: 'Nov 2023', phone: '+250 788 123 013', rent: '410,000' },
  { id: 10, name: 'Samsung Experience', category: 'Electronics',        unit: 'L1-A05', floor: 'L1', status: 'verified',     since: 'Jan 2025', phone: '+250 788 123 014', rent: '720,000' },
  { id: 11, name: 'Cinemax Cinema',     category: 'Entertainment',      unit: 'L2-A01', floor: 'L2', status: 'verified',     since: 'Dec 2022', phone: '+250 788 123 020', rent: '1,200,000' },
  { id: 12, name: 'Planet Fitness',     category: 'Sports & Fitness',   unit: 'L2-A02', floor: 'L2', status: 'verified',     since: 'Mar 2023', phone: '+250 788 123 021', rent: '980,000' },
  { id: 13, name: 'Jollof House',       category: 'Food & Beverages',   unit: 'L2-A03', floor: 'L2', status: 'verified',     since: 'Aug 2024', phone: '+250 788 123 022', rent: '560,000' },
];

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'gray'; label: string }> = {
  verified:     { variant: 'green', label: 'Verified'     },
  needs_review: { variant: 'amber', label: 'Needs review' },
  unverified:   { variant: 'gray',  label: 'Unverified'   },
};

const FLOORS = ['All', 'G', 'L1', 'L2'];

export default function TenantsPage() {
  const [search,   setSearch]   = useState('');
  const [floor,    setFloor]    = useState('All');
  const [selected, setSelected] = useState<typeof TENANTS[0] | null>(null);

  const filtered = TENANTS.filter(
    (t) =>
      (floor === 'All' || t.floor === floor) &&
      (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
                  t.category.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Tenants</h1>
          <p className="text-sm text-ink-400 mt-0.5">{TENANTS.length} tenants · 3 floors</p>
        </div>
        <button className="btn-primary text-xs py-1.5">
          <Plus className="w-3.5 h-3.5" /> Add tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category…"
            className="input-base pl-9"
          />
        </div>
        <div className="flex items-center bg-white border border-ink-200 rounded-lg p-1 gap-0.5">
          {FLOORS.map((f) => (
            <button key={f} onClick={() => setFloor(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                ${floor === f ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-400 font-medium">{filtered.length} results</span>
      </div>

      {/* Content */}
      <div className="flex gap-4">

        {/* Table */}
        <div className="card overflow-hidden flex-1 min-w-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest">Tenant</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest hidden lg:table-cell">Unit</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest hidden xl:table-cell">Since</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-widest hidden xl:table-cell">Rent (RWF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((t) => (
                <tr key={t.id}
                    onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === t.id ? 'bg-primary-50' : 'hover:bg-ink-50'
                    }`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(t.name)}`}>
                        {initials(t.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                        <p className="text-xs text-ink-400 md:hidden">{t.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-ink-600">{t.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-ink-100 text-ink-600 px-2 py-0.5 rounded font-mono">{t.unit}</span>
                      <span className="text-xs bg-ink-50 text-ink-400 px-1.5 py-0.5 rounded font-medium">{t.floor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-xs text-ink-500">{t.since}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[t.status]!.variant}>
                      {STATUS_BADGE[t.status]!.label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right hidden xl:table-cell">
                    <span className="text-sm font-semibold text-ink-900 tabular-nums">{t.rent}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-68 flex-shrink-0 self-start sticky top-0" style={{ width: '264px' }}>
            <div className="card overflow-hidden">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-ink-900">Tenant details</h3>
                <button onClick={() => setSelected(null)}
                  className="w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors">
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${avatarColor(selected.name)}`}>
                    {initials(selected.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate">{selected.name}</p>
                    <p className="text-xs text-ink-400">{selected.category}</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-ink-50 text-xs mb-5">
                  <DetailRow label="Unit"   value={`${selected.unit} · Floor ${selected.floor}`} />
                  <DetailRow label="Status" value={<Badge variant={STATUS_BADGE[selected.status]!.variant}>{STATUS_BADGE[selected.status]!.label}</Badge>} />
                  <DetailRow label="Since"  value={selected.since} />
                  <DetailRow label="Phone"  value={selected.phone} />
                  <DetailRow label="Rent"   value={`${selected.rent} RWF`} strong />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-5">
                  {[['124', 'Views'], ['32', 'Directions'], ['8', 'Calls']].map(([v, l]) => (
                    <div key={l} className="bg-ink-50 rounded-lg py-2.5">
                      <p className="text-sm font-bold text-ink-900">{v}</p>
                      <p className="text-[10px] text-ink-400 font-medium mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-primary py-1.5 text-xs justify-center">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="btn-secondary py-1.5 text-xs justify-center">
                    <Map className="w-3.5 h-3.5" /> Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-ink-400 font-medium">{label}</span>
      <span className={strong ? 'font-bold text-ink-900' : 'text-ink-700'}>{value}</span>
    </div>
  );
}
