'use client';

import { BarChart3, Loader2, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function PlatformSettlementPage() {
  const data = trpc.platform.settlement.useQuery();

  const totals = (data.data ?? []).reduce(
    (acc, r) => {
      acc.gmv += r.gmv;
      acc.rent += r.rentCollected;
      acc.advance += r.advanceOutstanding;
      return acc;
    },
    { gmv: 0, rent: 0, advance: 0 },
  );

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Platform Console</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Settlement</h1>
        <p className="text-sm text-ink-500 mt-1">Money moved through each partner mall.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-2xl overflow-hidden mb-6">
        <Total label="Network GMV"       value={totals.gmv} />
        <Total label="Rent collected"    value={totals.rent} />
        <Total label="Advances outstanding" value={totals.advance} tone="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header py-3 px-5 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-600" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-ink-900">Per-mall breakdown</h2>
        </div>
        {data.isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !data.data?.length ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
            <Building2 className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
            No malls onboarded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 border-b border-ink-100">
                <th className="px-5 py-2.5 font-semibold">Mall</th>
                <th className="px-3 py-2.5 font-semibold">Operator</th>
                <th className="px-3 py-2.5 font-semibold text-right">GMV</th>
                <th className="px-3 py-2.5 font-semibold text-right">Rent collected</th>
                <th className="px-5 py-2.5 font-semibold text-right">Advance outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.buildingId} className="border-b border-ink-50 hover:bg-ink-50/60 transition-colors">
                  <td className="px-5 py-3 font-semibold text-ink-900">{r.buildingName}</td>
                  <td className="px-3 py-3 text-ink-600">{r.orgName ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.gmv.toLocaleString('en-RW')}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-success-700">{r.rentCollected.toLocaleString('en-RW')}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-warning-700">{r.advanceOutstanding.toLocaleString('en-RW')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  const color = tone === 'warning' ? 'text-warning-700' : 'text-ink-900';
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2">{label}</p>
      <p className={`text-xl font-extrabold tracking-tight tabular-nums ${color}`}>
        {value.toLocaleString('en-RW')} <span className="text-[11px] font-medium opacity-70">RWF</span>
      </p>
    </div>
  );
}
