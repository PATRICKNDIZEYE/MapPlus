'use client';

import { useState } from 'react';
import { TrendingUp, Loader2, Search, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const WINDOW_OPTIONS = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function MallDemandPage() {
  const [windowDays, setWindowDays] = useState(30);
  const clusters = trpc.search.demandClusters.useQuery({ windowDays });

  const totalAttempts = (clusters.data ?? []).reduce((s, c) => s + c.totalCount, 0);

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Mall Management</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Demand intelligence</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-2xl">
            Clusters of shopper searches that returned zero results — categories of demand
            you&apos;re not yet meeting. Embeddings group related queries so &ldquo;laptop&rdquo;,
            &ldquo;notebook computer&rdquo;, and the Kinyarwanda equivalent appear as one row.
          </p>
        </div>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="input-base text-sm py-1.5 px-3 flex-shrink-0"
        >
          {WINDOW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </header>

      {/* Total banner */}
      <div className="card p-5 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary-600" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">
            {totalAttempts.toLocaleString('en-RW')} failed search{totalAttempts === 1 ? '' : 'es'} in the last {windowDays} days
          </p>
          <p className="text-xs text-ink-500 mt-0.5">
            {clusters.data?.length ?? 0} distinct demand cluster{(clusters.data?.length ?? 0) === 1 ? '' : 's'}.
            Each one is a leasable opportunity.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header py-3 px-5">
          <h2 className="text-sm font-semibold text-ink-900">Demand clusters</h2>
        </div>

        {clusters.isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Clustering queries with embeddings…</div>
        ) : clusters.error ? (
          <div className="px-5 py-12 text-center text-sm text-danger-700">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            {clusters.error.message}
          </div>
        ) : !clusters.data?.length ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-sm text-ink-500">
            <Search className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
            No failed searches in this window. Either every shopper finds what they want — or no one is searching.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {clusters.data.map((c) => <ClusterRow key={c.label} cluster={c} max={clusters.data[0]!.totalCount} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

type Cluster = {
  label: string;
  queries: Array<{ query: string; count: number }>;
  totalCount: number;
};

function ClusterRow({ cluster, max }: { cluster: Cluster; max: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((cluster.totalCount / Math.max(max, 1)) * 100);
  const others = cluster.queries.slice(1);

  return (
    <li className="px-5 py-3.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold text-ink-900 truncate">&ldquo;{cluster.label}&rdquo;</p>
            <p className="text-xs text-ink-400">{cluster.queries.length} variant{cluster.queries.length === 1 ? '' : 's'}</p>
          </div>
          {/* Bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-ink-100 overflow-hidden max-w-md">
            <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-sm font-bold tabular-nums text-ink-900 flex-shrink-0">
          {cluster.totalCount.toLocaleString('en-RW')}
        </p>
      </button>

      {expanded && others.length > 0 && (
        <div className="mt-3 ml-1 pl-3 border-l-2 border-ink-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5">Also includes</p>
          <ul className="space-y-1">
            {others.map((q) => (
              <li key={q.query} className="flex items-center justify-between text-xs">
                <span className="text-ink-700 truncate">&ldquo;{q.query}&rdquo;</span>
                <span className="text-ink-400 tabular-nums flex-shrink-0 ml-2">{q.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
