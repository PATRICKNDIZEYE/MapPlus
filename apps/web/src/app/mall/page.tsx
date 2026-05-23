'use client';

import Link from 'next/link';
import {
  ExternalLink, Plus, Users, Store, Search, AlertTriangle,
  TrendingUp, ScanLine, Eye, AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';

const STATS: Array<{
  label: string; value: string; sub: string;
  trend: { value: number; up: boolean };
  icon: LucideIcon; color: 'blue' | 'green' | 'purple' | 'amber';
}> = [
  { label: 'Visitors today',  value: '1,247', sub: '22 May 2026',    trend: { value: 14, up: true  }, icon: Users,         color: 'blue'   },
  { label: 'Shops open',      value: '11/13', sub: '2 closed today', trend: { value: 0,  up: true  }, icon: Store,         color: 'green'  },
  { label: 'Search queries',  value: '342',   sub: 'Last 24 h',      trend: { value: 8,  up: true  }, icon: Search,        color: 'purple' },
  { label: 'Failed searches', value: '23',    sub: 'Need review',    trend: { value: 5,  up: false }, icon: AlertTriangle, color: 'amber'  },
];

const FLOORS = [
  { name: 'Ground Floor', short: 'G',  total: 6, occupied: 5, vacant: 1, shops: 5 },
  { name: 'Level 1',      short: 'L1', total: 5, occupied: 5, vacant: 0, shops: 5 },
  { name: 'Level 2',      short: 'L2', total: 3, occupied: 3, vacant: 0, shops: 3 },
];

const ACTIVITY = [
  { time: '2 min ago',  type: 'search', text: 'Search "pharmacy" matched Royal Pharmacy',     floor: 'G'  },
  { time: '5 min ago',  type: 'scan',   text: 'QR scan at Main Entrance',                      floor: 'G'  },
  { time: '8 min ago',  type: 'view',   text: 'KFC CHIC profile viewed 6 times',               floor: 'G'  },
  { time: '12 min ago', type: 'search', text: 'Search "shoes" matched Simba Sports',           floor: 'G'  },
  { time: '18 min ago', type: 'fail',   text: 'Failed search: "supermarket" — 0 results',      floor: 'L1' },
  { time: '24 min ago', type: 'view',   text: 'iStore Rwanda profile viewed',                   floor: 'L1' },
  { time: '31 min ago', type: 'scan',   text: 'QR scan at Level 1 elevator',                    floor: 'L1' },
  { time: '45 min ago', type: 'fail',   text: 'Failed search: "food court" — 0 results',        floor: 'L2' },
];

const FAILED = [
  { query: 'supermarket',  count: 47, trend: '+12', pct: 94 },
  { query: 'food court',   count: 38, trend: '+5',  pct: 76 },
  { query: 'parking',      count: 29, trend: '—',   pct: 58 },
  { query: 'wifi',         count: 21, trend: '+3',  pct: 42 },
  { query: 'post office',  count: 18, trend: '—',   pct: 36 },
];

const HOURLY = [18, 24, 32, 28, 41, 53, 60, 55, 48, 62, 58, 42, 35, 30];
const MAX_H = Math.max(...HOURLY);

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
    search: { icon: Search,       bg: 'bg-primary-50',  color: 'text-primary-600' },
    scan:   { icon: ScanLine,     bg: 'bg-success-50',  color: 'text-success-700' },
    view:   { icon: Eye,          bg: 'bg-ink-100',     color: 'text-ink-500'     },
    fail:   { icon: AlertCircle,  bg: 'bg-warning-50',  color: 'text-warning-700' },
  };
  const item = map[type] ?? map.view!;
  const Icon = item.icon;
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${item.color}`} strokeWidth={2} />
    </div>
  );
}

export default function AdminDashboard() {
  const today = new Date().toLocaleDateString('en-RW', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const totalUnits    = FLOORS.reduce((s, f) => s + f.total, 0);
  const totalOccupied = FLOORS.reduce((s, f) => s + f.occupied, 0);
  const occupancyPct  = Math.round((totalOccupied / totalUnits) * 100);

  return (
    <div className="p-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Overview</h1>
          <p className="text-sm text-ink-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/map/chic-kigali" target="_blank" className="btn-secondary py-1.5 text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Public map
          </Link>
          <Link href="/mall/tenants/assign" className="btn-primary py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add tenant
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left 2/3 */}
        <div className="xl:col-span-2 space-y-4">

          {/* Floor occupancy */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Floor occupancy</h2>
                <p className="text-xs text-ink-400 mt-0.5">{totalOccupied}/{totalUnits} units · {occupancyPct}% occupied</p>
              </div>
              <Link href="/mall/units" className="text-xs text-primary-600 hover:underline font-semibold">
                Manage
              </Link>
            </div>
            <div className="px-5 py-5 space-y-5">
              {FLOORS.map((floor) => {
                const pct = Math.round((floor.occupied / floor.total) * 100);
                return (
                  <div key={floor.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-ink-200 bg-ink-50 flex items-center justify-center text-xs font-bold text-ink-600 flex-shrink-0">
                          {floor.short}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-800">{floor.name}</p>
                          <p className="text-xs text-ink-400">{floor.shops} shops · {floor.occupied}/{floor.total} units</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-ink-900">{pct}%</p>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === 100 ? 'bg-success-DEFAULT' : pct > 70 ? 'bg-primary-600' : 'bg-warning-DEFAULT'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {floor.vacant > 0 && (
                      <p className="text-xs text-warning-700 mt-1.5 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                        {floor.vacant} vacant unit
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Failed searches */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Failed searches</h2>
                <p className="text-xs text-ink-400 mt-0.5">What visitors cannot find — last 30 days</p>
              </div>
              <span className="badge bg-warning-100 text-warning-700">Leasing signal</span>
            </div>
            <div className="divide-y divide-ink-50">
              {FAILED.map((item, i) => (
                <div key={item.query} className="px-5 py-3.5 flex items-center gap-4 hover:bg-ink-50 transition-colors">
                  <span className="text-xs font-bold text-ink-200 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800">&ldquo;{item.query}&rdquo;</p>
                    <div className="h-1 bg-ink-100 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-warning-DEFAULT rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-10">
                    <p className="text-sm font-bold text-ink-900">{item.count}</p>
                    <p className={`text-xs font-medium ${item.trend.startsWith('+') ? 'text-danger-700' : 'text-ink-400'}`}>
                      {item.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-warning-50 border-t border-warning-100 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-warning-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-xs text-warning-700 font-medium">
                47 visitors searched &ldquo;supermarket&rdquo; this month. Consider this for vacant unit G-B02.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">

          {/* Hourly chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">Visitors today</h2>
                <p className="text-2xl font-extrabold text-ink-900 mt-1 tracking-tight">1,247</p>
              </div>
              <span className="badge bg-success-100 text-success-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} /> 14%
              </span>
            </div>
            <div className="flex items-end gap-1 h-14">
              {HOURLY.map((v, i) => (
                <div key={i} className="flex-1">
                  <div
                    className={`w-full rounded-sm ${i === HOURLY.length - 1 ? 'bg-primary-600' : 'bg-primary-100'}`}
                    style={{ height: `${(v / MAX_H) * 56}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-ink-300 font-medium mt-1.5">
              <span>8am</span><span>12pm</span><span>4pm</span><span>Now</span>
            </div>
          </div>

          {/* Activity feed */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-ink-900">Recent activity</h2>
              <span className="text-xs text-ink-400">Live</span>
            </div>
            <div className="divide-y divide-ink-50 max-h-80 overflow-y-auto">
              {ACTIVITY.map((item, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-700 leading-relaxed">{item.text}</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      {item.time} <span className="text-ink-200">·</span> Floor {item.floor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
