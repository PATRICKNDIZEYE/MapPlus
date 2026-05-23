'use client';

import { Download, TrendingUp, AlertCircle } from 'lucide-react';

const HOURLY = [
  { h: '8am',  v: 42  }, { h: '9am',  v: 78  }, { h: '10am', v: 115 },
  { h: '11am', v: 143 }, { h: '12pm', v: 189 }, { h: '1pm',  v: 201 },
  { h: '2pm',  v: 176 }, { h: '3pm',  v: 162 }, { h: '4pm',  v: 148 },
  { h: '5pm',  v: 134 }, { h: '6pm',  v: 98  }, { h: '7pm',  v: 61  },
];
const MAX_V = Math.max(...HOURLY.map((d) => d.v));

const TOP_SEARCHES = [
  { q: 'pharmacy',  n: 89, result: 'Royal Pharmacy'     },
  { q: 'kfc',       n: 76, result: 'KFC CHIC'           },
  { q: 'iphone',    n: 64, result: 'iStore Rwanda'      },
  { q: 'airtime',   n: 58, result: 'MTN MoMo / Airtel'  },
  { q: 'gym',       n: 47, result: 'Planet Fitness'     },
  { q: 'movies',    n: 44, result: 'Cinemax Cinema'     },
  { q: 'coffee',    n: 38, result: 'The Book Cafe'      },
  { q: 'samsung',   n: 31, result: 'Samsung Experience' },
];

const FAILED = [
  { q: 'supermarket', n: 47, note: 'No grocery tenant'          },
  { q: 'food court',  n: 38, note: 'No dedicated food court'    },
  { q: 'parking',     n: 29, note: 'Parking not mapped yet'     },
  { q: 'wifi',        n: 21, note: 'No free WiFi information'   },
  { q: 'post office', n: 18, note: 'No postal service tenant'   },
];

const QR_SCANS = [
  { location: 'Main Entrance',    floor: 'G',  scans: 312 },
  { location: 'Level 1 Elevator', floor: 'L1', scans: 187 },
  { location: 'Level 2 Stairs',   floor: 'L2', scans: 134 },
  { location: 'West Exit',        floor: 'G',  scans: 89  },
];

const KPIS = [
  { label: 'Total visitors',  value: '31,408', trend: '+22%' },
  { label: 'Total searches',  value: '8,942',  trend: '+18%' },
  { label: 'QR scans',        value: '2,156',  trend: '+31%' },
  { label: 'Avg. session',    value: '8.4 min',trend: '+2m'  },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-400 mt-0.5">Last 30 days · CHIC Kigali</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-base max-w-[160px] text-xs">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Today</option>
          </select>
          <button className="btn-secondary text-xs py-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIS.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-2">{k.label}</p>
            <p className="text-2xl font-extrabold text-ink-900 tracking-tight">{k.value}</p>
            <p className="text-xs font-semibold text-success-700 flex items-center gap-1 mt-1.5">
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} /> {k.trend} vs prev period
            </p>
          </div>
        ))}
      </div>

      {/* Hourly chart + QR locations */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">

        {/* Hourly chart */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Visitor volume</h2>
              <p className="text-xs text-ink-400 mt-0.5">Today · hourly breakdown</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-primary-600 inline-block" />Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-ink-100 inline-block" />Yesterday
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-44">
            {HOURLY.map((d) => (
              <div key={d.h} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full relative">
                  {/* Yesterday */}
                  <div className="w-full bg-ink-100 rounded-t"
                       style={{ height: `${((d.v * 0.87) / MAX_V) * 140}px` }} />
                  {/* Today */}
                  <div className="w-full bg-primary-600 rounded-t -mt-px group relative"
                       style={{ height: `${(d.v / MAX_V) * 140}px` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {d.v}
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-ink-400 font-medium whitespace-nowrap">{d.h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QR scans */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-ink-900">QR scan locations</h2>
          </div>
          <div className="divide-y divide-ink-50">
            {QR_SCANS.map((s, i) => (
              <div key={s.location} className="px-5 py-3.5 flex items-center gap-3">
                <span className="text-xs font-bold text-ink-200 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{s.location}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 flex-1 bg-ink-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(s.scans / 312) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-ink-400 font-medium flex-shrink-0">Floor {s.floor}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-ink-900 flex-shrink-0 tabular-nums">{s.scans}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top + Failed searches */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Top searches */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-ink-900">Top search terms</h2>
            <span className="badge bg-success-100 text-success-700">Successful</span>
          </div>
          <div className="divide-y divide-ink-50">
            {TOP_SEARCHES.map((s, i) => (
              <div key={s.q} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-ink-200 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-ink-800">&ldquo;{s.q}&rdquo;</p>
                    <span className="text-[10px] text-ink-400 font-medium truncate">→ {s.result}</span>
                  </div>
                  <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-success-DEFAULT rounded-full" style={{ width: `${(s.n / 89) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-ink-900 flex-shrink-0 tabular-nums">{s.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Failed searches */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-ink-900">Failed searches</h2>
            <span className="badge bg-warning-100 text-warning-700">Action needed</span>
          </div>
          <div className="divide-y divide-ink-50">
            {FAILED.map((s, i) => (
              <div key={s.q} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-ink-200 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800">&ldquo;{s.q}&rdquo;</p>
                  <p className="text-xs text-warning-700 font-medium mt-0.5">{s.note}</p>
                  <div className="h-1 bg-ink-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-warning-DEFAULT rounded-full" style={{ width: `${(s.n / 47) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-ink-900 flex-shrink-0 tabular-nums">{s.n}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-warning-50 border-t border-warning-100 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-warning-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-xs text-warning-700 font-medium">
              These represent untapped tenant opportunities. Share with your leasing team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
