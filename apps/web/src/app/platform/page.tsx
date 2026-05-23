'use client';

import Link from 'next/link';
import {
  Building2, Users, Package, TrendingUp, Wallet, ShoppingBag,
  Loader2, ArrowRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function PlatformOverviewPage() {
  const overview = trpc.platform.overview.useQuery();

  if (overview.isLoading) {
    return <div className="px-8 py-7 text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>;
  }
  if (overview.error || !overview.data) {
    return <div className="px-8 py-7 text-sm text-danger-700">{overview.error?.message ?? 'Failed to load.'}</div>;
  }

  const d = overview.data;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Platform Console</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Network overview</h1>
        <p className="text-sm text-ink-500 mt-1">Aggregate state across every mall on mallGuide.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-ink-200 border border-ink-200 rounded-2xl overflow-hidden mb-6">
        <KPI label="Mall orgs"      value={d.counts.orgs.toString()}       icon={Building2} />
        <KPI label="Buildings"      value={`${d.counts.active}/${d.counts.buildings}`} icon={Building2} sub="active / total" />
        <KPI label="Tenants"        value={d.counts.tenants.toString()}    icon={Users} />
        <KPI label="Live products"  value={d.counts.products.toString()}   icon={Package} />
        <KPI label="GMV (paid)"     value={d.money.gmvTotal.toLocaleString('en-RW')} icon={ShoppingBag} sub="RWF" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary-600" strokeWidth={2} />
            Money in motion
          </h2>
          <dl className="space-y-3 text-sm">
            <MoneyRow label="Rent collected"            value={d.money.rentCollected} />
            <MoneyRow label="Active advances (principal)" value={d.money.advancePrincipal} />
            <MoneyRow label="Outstanding advance debt"  value={d.money.advanceOutstanding} tone="warning" />
          </dl>
          <Link href="/platform/settlement" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800">
            Per-mall settlement <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
          </Link>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-600" strokeWidth={2} />
            Recent mall orgs
          </h2>
          {!d.recentOrgs.length ? (
            <p className="text-sm text-ink-500">No orgs yet. <Link href="/platform/orgs" className="text-primary-700 font-semibold">Onboard one</Link>.</p>
          ) : (
            <ul className="divide-y divide-ink-100 -mx-5">
              {d.recentOrgs.map((o) => (
                <li key={o.id} className="px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{o.name}</p>
                    <p className="text-[11px] text-ink-400">Created {new Date(o.createdAt).toLocaleDateString('en-RW')}</p>
                  </div>
                  <Link href="/platform/orgs" className="text-xs text-primary-700 font-semibold">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: typeof Building2 }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />}
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      </div>
      <p className="text-xl font-extrabold tracking-tight tabular-nums text-ink-900">{value}</p>
      {sub && <p className="text-[10px] text-ink-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MoneyRow({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  const color = tone === 'warning' ? 'text-warning-700' : 'text-ink-900';
  return (
    <div className="flex items-baseline justify-between">
      <p className="text-ink-600">{label}</p>
      <p className={`font-bold tabular-nums ${color}`}>
        {value.toLocaleString('en-RW')} <span className="text-[11px] font-medium opacity-70">RWF</span>
      </p>
    </div>
  );
}
