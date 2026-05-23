import {
  Map as MapIcon, Search, FileText, BarChart3, Store, ScanLine,
} from 'lucide-react';

/**
 * The arc of floating frosted-glass cards under the landing hero.
 * Each card represents one mallGuide surface and a single legible metric.
 */

interface CardSpec {
  badge: string;
  icon:  React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor: string;     // tailwind class for the icon container
  title: string;
  body:  string;
  metric: string;
  metricLabel: string;
  pills?: string[];
  rotate: number;        // deg
  ty:     number;        // px translateY
  z:      number;
  delay:  string;        // animation delay class
}

const CARDS: CardSpec[] = [
  {
    badge: 'PLAN',
    icon: MapIcon,
    iconColor: 'bg-emerald-200/40 text-emerald-800',
    title: 'Every unit, mapped.',
    body:  'Each unit is a real PostGIS polygon — actual shape, actual area, clickable.',
    metric: '890',
    metricLabel: 'unit polygons',
    pills: ['5 floors', '60% leased'],
    rotate: -8, ty: -8, z: 1, delay: 'delay-0',
  },
  {
    badge: 'SEARCH',
    icon: Search,
    iconColor: 'bg-sky-200/40 text-sky-800',
    title: 'Find any shop in 300 ms.',
    body:  'Postgres full-text + trigram fuzzy match across every floor in the building.',
    metric: '~300',
    metricLabel: 'ms p95',
    pills: ['Full-text', 'Fuzzy'],
    rotate: -4, ty: 0, z: 2, delay: 'delay-75',
  },
  {
    badge: 'LEASE',
    icon: FileText,
    iconColor: 'bg-violet-200/40 text-violet-800',
    title: 'Sign leases in minutes.',
    body:  'Wizard creates the tenant, the shop, and an e-contract both parties sign.',
    metric: '4',
    metricLabel: 'step flow',
    pills: ['E-signed', 'Auditable'],
    rotate: 0, ty: 6, z: 3, delay: 'delay-100',
  },
  {
    badge: 'DEMAND',
    icon: BarChart3,
    iconColor: 'bg-amber-200/40 text-amber-800',
    title: 'Demand made legible.',
    body:  'Failed searches and traffic become the signal for which units to lease next.',
    metric: 'Live',
    metricLabel: '30-day window',
    pills: ['Search log', 'Heatmap'],
    rotate: 4, ty: 0, z: 2, delay: 'delay-150',
  },
  {
    badge: 'TENANTS',
    icon: Store,
    iconColor: 'bg-rose-200/40 text-rose-800',
    title: 'Self-serve every shop.',
    body:  'Tenants write their own profile, hours, catalog, and photos. Zero admin tickets.',
    metric: '0',
    metricLabel: 'support tickets',
    pills: ['Profile', 'Catalog', 'QR'],
    rotate: 8, ty: -8, z: 1, delay: 'delay-200',
  },
];

export function HeroProductFan() {
  return (
    <div className="relative w-full">
      <div className="relative flex items-end justify-center gap-3 px-2 sm:gap-4 sm:px-6 mx-auto max-w-6xl">
        {CARDS.map((c) => <GlassCard key={c.badge} card={c} />)}
      </div>
    </div>
  );
}

function GlassCard({ card }: { card: CardSpec }) {
  const Icon = card.icon;
  return (
    <div
      className={`relative rounded-2xl border border-white/30 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)] backdrop-blur-md
                  w-[200px] sm:w-[220px] md:w-[230px] flex-shrink-0
                  motion-safe:animate-[fadeUp_0.9s_ease-out_both] ${card.delay}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.30) 100%)',
        transform: `translateY(${card.ty}px) rotate(${card.rotate}deg)`,
        zIndex: card.z,
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-md ${card.iconColor}`}>
            <Icon className="w-3 h-3" strokeWidth={2.5} />
            {card.badge}
          </span>
          <ScanLine className="w-3 h-3 text-ink-400" strokeWidth={2} />
        </div>

        <p className="mt-3 text-[14px] font-extrabold text-ink-900 leading-snug tracking-tight">
          {card.title}
        </p>
        <p className="mt-1.5 text-[11px] text-ink-600 leading-relaxed">
          {card.body}
        </p>
      </div>

      <div className="px-4 pb-3 mt-2 border-t border-white/40">
        <div className="flex items-baseline gap-1.5 mt-2">
          <p className="text-2xl font-black text-ink-900 tracking-tight tabular-nums">
            {card.metric}
          </p>
          <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest">
            {card.metricLabel}
          </p>
        </div>

        {card.pills && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {card.pills.map((p) => (
              <span key={p}
                className="text-[9px] font-semibold text-ink-700 bg-white/60 border border-white/50 rounded-md px-1.5 py-0.5">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
