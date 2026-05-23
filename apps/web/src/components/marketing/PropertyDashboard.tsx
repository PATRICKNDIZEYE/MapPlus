import {
  Map as MapIcon, ArrowUpRight, ArrowDownRight, ScanLine,
  Clock, Search, ChevronDown,
} from 'lucide-react';

/**
 * Landing-page hero visual. Distinctly mallGuide — three packed information
 * panels on the right (not the generic KPI rail of a property-management
 * dashboard): a live snapshot grid, an audit-style activity feed, and a
 * "top failed searches" demand-signal list. Pure SVG + Tailwind.
 */

const POLYS: Array<{ d: string; status: keyof typeof STATUS }> = [
  // NW wing
  { d: 'M70,60 L150,55 L155,135 L70,140 Z',         status: 'signed' },
  { d: 'M155,55 L235,52 L235,135 L155,135 Z',       status: 'signed' },
  { d: 'M235,52 L300,55 L300,135 L235,135 Z',       status: 'vacant' },

  // SW anchor
  { d: 'M40,150 L150,150 L155,250 L80,260 L40,250 Z', status: 'signed' },

  // Main upper row
  { d: 'M155,150 L230,150 L230,200 L155,200 Z',     status: 'signed' },
  { d: 'M230,150 L305,150 L305,200 L230,200 Z',     status: 'negotiations' },
  { d: 'M305,150 L380,150 L380,200 L305,200 Z',     status: 'signed' },
  { d: 'M380,150 L455,150 L455,200 L380,200 Z',     status: 'signed' },
  { d: 'M455,150 L530,150 L530,200 L455,200 Z',     status: 'vacant' },
  { d: 'M530,150 L600,150 L600,200 L530,200 Z',     status: 'signed' },
  { d: 'M600,150 L675,150 L675,200 L600,200 Z',     status: 'signed' },
  { d: 'M675,150 L745,150 L745,200 L675,200 Z',     status: 'terminated' },

  // Main lower row
  { d: 'M155,210 L230,210 L230,260 L155,260 Z',     status: 'signed' },
  { d: 'M230,210 L310,210 L310,260 L230,260 Z',     status: 'signed' },
  { d: 'M310,210 L380,210 L380,260 L310,260 Z',     status: 'vacant' },
  { d: 'M380,210 L450,210 L450,260 L380,260 Z',     status: 'signed' },
  { d: 'M450,210 L520,210 L520,260 L450,260 Z',     status: 'signed' },
  { d: 'M520,210 L600,210 L600,260 L520,260 Z',     status: 'vacant' },
  { d: 'M600,210 L685,210 L685,260 L600,260 Z',     status: 'awaiting' },
  { d: 'M685,210 L745,210 L745,260 L685,260 Z',     status: 'signed' },

  // SE extension
  { d: 'M150,260 L300,265 L305,300 L155,300 Z',     status: 'awaiting' },
  { d: 'M305,265 L470,268 L470,300 L305,300 Z',     status: 'signed' },
  { d: 'M470,268 L600,268 L600,300 L470,300 Z',     status: 'vacant' },
];

const STATUS = {
  signed:       { fill: '#86efac', stroke: '#166534', label: 'Leased' },
  negotiations: { fill: '#a78bfa', stroke: '#5b21b6', label: 'In negotiation' },
  vacant:       { fill: '#dbe2f0', stroke: '#94a3b8', label: 'Vacant' },
  terminated:   { fill: '#fca5a5', stroke: '#b91c1c', label: 'Terminated' },
  awaiting:     { fill: '#fbbf24', stroke: '#b45309', label: 'Awaiting signing' },
} as const;

const LEGEND_ORDER: (keyof typeof STATUS)[] = ['signed', 'negotiations', 'awaiting', 'vacant', 'terminated'];

const SNAPSHOT: Array<{ label: string; value: string; sub: string; delta?: { dir: 'up' | 'down'; v: string } }> = [
  { label: 'Monthly rent',  value: '$89.2k', sub: 'across 5 floors', delta: { dir: 'up',   v: '3.1%' } },
  { label: 'Occupancy',     value: '60%',    sub: '530 of 890',      delta: { dir: 'up',   v: '0.4%' } },
  { label: 'Vacant units',  value: '360',    sub: 'on the floor',    delta: { dir: 'down', v: '12'   } },
  { label: 'New leases',    value: '14',     sub: 'this quarter',    delta: { dir: 'up',   v: '5'    } },
];

const ACTIVITY: Array<{ subject: string; verb: string; meta: string; t: string }> = [
  { subject: 'Vertex Devices',  verb: 'lease renewed',    meta: '36 months', t: '2h' },
  { subject: 'Polaris Skin',    verb: 'cover photo set',  meta: 'L1 · B14',  t: '5h' },
  { subject: 'Unit G-C03',      verb: '→ Reserved',       meta: 'by ops',    t: '1d' },
  { subject: 'Cinema Loop',     verb: '3 products added', meta: 'L4 · A02',  t: '2d' },
];

const FAILED: Array<{ term: string; n: number; trend: 'up' | 'down' | 'flat' }> = [
  { term: 'ice cream',         n: 18, trend: 'up'   },
  { term: 'currency exchange', n: 12, trend: 'up'   },
  { term: 'kids playground',   n:  8, trend: 'flat' },
  { term: 'bookstore',         n:  6, trend: 'down' },
  { term: 'optician',          n:  4, trend: 'up'   },
];

export function PropertyDashboard() {
  return (
    <div className="rounded-2xl bg-white border border-ink-200 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.45)] overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-ink-100 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-ink-900 tracking-tight">CHIC Kigali</p>
          <span className="h-3 w-px bg-ink-200" />
          <div className="flex items-center gap-1 text-[11px] font-bold text-ink-700 border border-ink-200 rounded-md px-2 py-0.5">
            Ground floor <ChevronDown className="w-3 h-3 text-ink-400" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success-DEFAULT opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-DEFAULT" />
          </span>
          Live
          <span className="text-ink-300 ml-2">v1.4 · upd. 32s ago</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.85fr_1fr]">

        {/* ── Map column ── */}
        <div className="border-r border-ink-100">

          {/* Tabs row + inline counts */}
          <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-ink-50 border border-ink-100 flex items-center justify-center">
                <MapIcon className="w-3 h-3 text-ink-500" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-ink-900">Property plan</span>
              <span className="text-[11px] font-medium text-ink-300">·</span>
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                {[
                  { label: 'Lease',    active: true  },
                  { label: 'Category', active: false },
                  { label: 'Revenue',  active: false },
                  { label: 'Foot traffic', active: false },
                ].map((t) => (
                  <span key={t.label}
                    className={`px-2 py-1 rounded-md
                      ${t.active
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-500 hover:bg-ink-50'}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-5 text-[11px]">
              <Counter label="Units"     value="178" />
              <Counter label="Area"      value="6,069 m²" />
              <Counter label="Occupied"  value="60%" accent="success" />
            </div>
          </div>

          {/* Floor plan SVG */}
          <div className="px-5 pt-4">
            <svg viewBox="0 0 800 360" className="w-full h-auto" aria-hidden role="presentation">
              <defs>
                <pattern id="prop-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="800" height="360" fill="url(#prop-grid)" />

              {POLYS.map((p, i) => {
                const s = STATUS[p.status];
                return (
                  <path
                    key={i}
                    d={p.d}
                    fill={s.fill}
                    stroke={s.stroke}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    opacity={p.status === 'vacant' ? 0.78 : 1}
                  />
                );
              })}

              {/* Route preview — a thin polyline from the anchor toward a NE unit */}
              <g>
                <path
                  d="M 445,205 L 510,205 L 510,175 L 640,175"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="0"
                  opacity="0.92"
                />
                <path
                  d="M 445,205 L 510,205 L 510,175 L 640,175"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.4"
                />
                <path
                  d="M 445,205 L 510,205 L 510,175 L 640,175"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Destination pin */}
              <g transform="translate(640 175)">
                <circle r="11" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                <circle r="5"  fill="#0ea5e9" />
              </g>

              {/* You-are-here anchor */}
              <g transform="translate(445 205)">
                <circle r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
                <circle r="5"  fill="#f59e0b" />
                <circle r="1.5" fill="#ffffff" />
              </g>

              {/* Route distance chip */}
              <g transform="translate(540 152)">
                <rect x="-22" y="-9" width="44" height="18" rx="9" fill="#0f172a" />
                <text x="0" y="3" textAnchor="middle" fill="#ffffff"
                  fontFamily="ui-monospace, SFMono-Regular, monospace" fontSize="9" fontWeight="700">
                  62 m
                </text>
              </g>
            </svg>
          </div>

          {/* Legend strip */}
          <div className="px-5 pt-3 pb-4 flex items-center flex-wrap gap-x-5 gap-y-1.5">
            {LEGEND_ORDER.map((k) => {
              const s = STATUS[k];
              return (
                <span key={k} className="flex items-center gap-1.5 text-[10px] text-ink-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-[2px]"
                    style={{ background: s.fill, border: `1.5px solid ${s.stroke}` }} />
                  {s.label}
                </span>
              );
            })}
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-ink-500 font-medium">
              <ScanLine className="w-3 h-3" strokeWidth={2} /> 24 QR anchors active
            </span>
          </div>
        </div>

        {/* ── Right rail: three packed panels ── */}
        <div className="bg-ink-50/60 divide-y divide-ink-100">

          {/* 1) Live snapshot 2×2 */}
          <div className="px-4 pt-4 pb-3">
            <PanelHeader label="Live snapshot" hint="Q2 · 2026" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {SNAPSHOT.map((s) => (
                <div key={s.label} className="bg-white rounded-lg border border-ink-100 px-3 py-2.5">
                  <p className="text-[10px] font-medium text-ink-500">{s.label}</p>
                  <p className="text-[18px] font-extrabold text-ink-900 tracking-tight tabular-nums leading-tight mt-0.5">
                    {s.value}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-ink-400">{s.sub}</p>
                    {s.delta && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold
                        ${s.delta.dir === 'up' ? 'text-success-700' : 'text-danger-700'}`}>
                        {s.delta.dir === 'up'
                          ? <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2.5} />
                          : <ArrowDownRight className="w-2.5 h-2.5" strokeWidth={2.5} />}
                        {s.delta.v}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2) Activity feed */}
          <div className="px-4 py-3">
            <PanelHeader label="Right now" hint="audit feed" />
            <ul className="mt-2 space-y-2">
              {ACTIVITY.map((a, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[11px] leading-tight">
                  <span className="w-1 h-1 rounded-full bg-ink-300 flex-shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-ink-900">{a.subject}</span>
                    <span className="text-ink-500"> · {a.verb}</span>
                    <span className="text-ink-300"> · {a.meta}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                    {a.t}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3) Demand signal */}
          <div className="px-4 py-3">
            <PanelHeader label="Top failed searches" hint="last 7d" icon={Search} />
            <ul className="mt-2 space-y-1.5">
              {FAILED.map((f) => (
                <li key={f.term} className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-700 font-medium truncate">{f.term}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[11px] font-bold text-ink-900 tabular-nums w-5 text-right">{f.n}</span>
                    {f.trend === 'up'
                      ? <ArrowUpRight   className="w-3 h-3 text-success-700" strokeWidth={2.5} />
                      : f.trend === 'down'
                      ? <ArrowDownRight className="w-3 h-3 text-danger-700"  strokeWidth={2.5} />
                      : <span className="w-3 h-3 inline-block" />}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-ink-400 mt-3 italic">
              Demand for ice cream rose 28% this month — no current tenant in that category.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value, accent }: { label: string; value: string; accent?: 'success' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-ink-400 font-medium">{label}</span>
      <span className={`font-bold tabular-nums tracking-tight ${accent === 'success' ? 'text-success-700' : 'text-ink-900'}`}>
        {value}
      </span>
    </div>
  );
}

function PanelHeader({
  label, hint, icon: Icon,
}: { label: string; hint?: string; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-700 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-ink-500" strokeWidth={2} />}
        {label}
      </p>
      {hint && <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-400">{hint}</span>}
    </div>
  );
}
