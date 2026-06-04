import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight,
} from 'lucide-react';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { PropertyDashboard } from '@/components/marketing/PropertyDashboard';
import { MallEntryHero } from '@/components/marketing/MallEntryHero';
import { TrendingShopsRow } from '@/components/marketing/TrendingShopsRow';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { YoGuideFloatingTeaser } from '@/components/marketing/YoGuideFloatingTeaser';

const PRINCIPLES = [
  {
    n: '01',
    title: 'Real polygons, not pins',
    body:
      'Every unit is its own PostGIS polygon — actual shape, actual area, actual neighbour. No pins floating on top of a street map borrowed from elsewhere.',
  },
  {
    n: '02',
    title: 'Search the inside',
    body:
      'Type a brand, a product, or a category. Postgres full-text plus trigram fuzzy match returns ranked results across every floor in roughly 300 milliseconds.',
  },
  {
    n: '03',
    title: 'QR is the GPS',
    body:
      'GPS dies indoors. We print a few dozen weatherproof codes at entrances and elevators. Visitors open the camera and the map snaps to a precise anchor.',
  },
  {
    n: '04',
    title: 'Demand is the asset',
    body:
      'Search misses, click density, and floor traffic become a live signal. Owners see which categories to lease next — not just which units happen to be empty.',
  },
];

const PROCESS = [
  {
    n: '01',
    title: 'Digitise the building',
    body:
      'Hand us a floor plan in any format. We turn it into PostGIS geometry — one polygon per unit, plus corridors, amenities, anchor points, and parking. Five to ten business days.',
  },
  {
    n: '02',
    title: 'Onboard the tenants',
    body:
      'Every tenant gets a login. They write their own profile, set their own hours, upload their own photos. You spend zero time on data entry.',
  },
  {
    n: '03',
    title: 'Print the QR codes',
    body:
      'A small batch of waterproof codes at entrances, elevators, and corridor junctions. No app to install — the visitor opens the phone camera and they are inside the map.',
  },
];

const AUDIENCES = [
  {
    role: 'Visitors',
    sub:  'Public web · No login',
    items: [
      'Search any shop by name, brand, or category',
      'Scan a QR to drop a precise "you are here" anchor',
      'Filter by floor or operating hours',
      'Cached after first load — works in the elevator',
    ],
  },
  {
    role: 'Owners',
    sub:  'Admin console · Role-based',
    items: [
      'Live floor occupancy and revenue per square metre',
      'Failed-search log — demand you are not yet meeting',
      'Tenant records with lease, contact, monthly rent',
      'Map versioning: draft, publish, archive',
    ],
  },
  {
    role: 'Tenants',
    sub:  'Self-serve portal',
    items: [
      'Edit shop name, description, and hours',
      'Upload cover photo and logo',
      'Track profile views, direction taps, call-throughs',
      'Manage product and service listings',
    ],
  },
];

const PILOT = [
  ['Building',        'CHIC Kigali · 5 floors · 132 × 32 m'],
  ['Unit polygons',   '890'],
  ['Occupied units',  '530 (60%)'],
  ['Search latency',  '~300 ms p95'],
  ['Roles defined',   '5 (super admin → tenant staff)'],
  ['Photos seeded',   '12 / 13 verified shops'],
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-jakarta text-ink-900">

      {/* Sticky/morphing nav — sits above the hero, then turns into a
          centred pill once the user scrolls past the first viewport. */}
      <MarketingHeader />

      {/* ── Cinematic mall entry hero ── */}
      <MallEntryHero />

      {/* ── Trending shops band — live data from CHIC ── */}
      <TrendingShopsRow />

      {/* ── Pilot / spec table ── */}
      <section id="pilot" className="border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <SectionLabel n="01" label="Pilot deployment" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              Already running in
              <br />a real building.
            </h2>
            <p className="text-ink-500 text-sm leading-relaxed mt-4 max-w-sm">
              CHIC Kigali is the launch site — a five-floor commercial centre in downtown Kigali.
              The numbers below are real and queried directly from the production database.
            </p>
          </div>

          <div className="lg:col-span-8">
            <dl className="divide-y divide-ink-100 border-y border-ink-100">
              {PILOT.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between py-4 gap-6">
                  <dt className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">{label}</dt>
                  <dd className="text-base font-bold text-ink-900 tabular-nums text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Owner console preview ── */}
      <section id="owners" className="border-b border-ink-100 bg-ink-900 text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-10">
            <SectionLabel n="02" label="What owners see" tone="dark" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              The building, on one screen.
            </h2>
            <p className="text-ink-300 text-base leading-relaxed mt-3">
              Live floor plan, lease status per unit, demand signals from failed searches,
              and a tenant audit feed — all wired to the same database.
            </p>
          </div>
          <PropertyDashboard />
        </div>
      </section>

      {/* ── Principles ── */}
      <section id="product" className="border-b border-ink-100 bg-ink-50/50">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <SectionLabel n="03" label="What we believe" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              Four ideas
              <br />we will not negotiate.
            </h2>
            <p className="text-ink-500 text-sm leading-relaxed mt-4 max-w-sm">
              Most indoor-mapping products are pins on top of Google Maps. We are not that.
              mallGuide is opinionated about a small number of things.
            </p>
          </div>

          <ol className="lg:col-span-8 space-y-px bg-ink-100 border border-ink-100 rounded-2xl overflow-hidden">
            {PRINCIPLES.map((p) => (
              <li key={p.n} className="bg-white p-7 grid grid-cols-[auto_1fr] gap-6">
                <span className="text-2xl font-extrabold text-ink-300 tabular-nums tracking-tight">
                  {p.n}
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink-900 tracking-tight mb-2">{p.title}</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-10">
            <SectionLabel n="04" label="How it ships" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              Floor plan to live product
              <br />in two weeks.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-y border-ink-100 divide-y md:divide-y-0 md:divide-x divide-ink-100">
            {PROCESS.map((step) => (
              <div key={step.n} className="py-8 md:px-8 first:md:pl-0 last:md:pr-0">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400">
                  Step {step.n}
                </span>
                <h3 className="text-lg font-bold text-ink-900 mt-2 mb-3 tracking-tight">{step.title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audiences ── */}
      <section id="audiences" className="border-b border-ink-100 bg-ink-50/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-10">
            <SectionLabel n="05" label="Three jobs, one database" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              The same data,
              <br />three different windows.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-2xl overflow-hidden">
            {AUDIENCES.map((card) => (
              <div key={card.role} className="bg-white p-7">
                <h3 className="text-base font-bold text-ink-900 tracking-tight">{card.role}</h3>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mt-1">{card.sub}</p>
                <ul className="mt-5 space-y-2.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-600 leading-relaxed">
                      <span className="text-ink-300 mt-1">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-ink-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel n="06" label="Try it" tone="dark" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter mt-4 leading-[1.05]">
              Walk through it
              <br />before you ask anything.
            </h2>
            <p className="text-ink-300 text-sm sm:text-base leading-relaxed mt-5 max-w-lg">
              The CHIC Kigali map is the same database the admin and tenant consoles are wired into.
              Spend five minutes there. Email us afterwards if it&apos;s interesting.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
            <Link href="/map/chic-kigali"
              className="inline-flex items-center justify-between gap-3 bg-white text-ink-900 font-bold text-sm px-5 py-3 rounded-lg hover:bg-ink-100 transition-colors w-full sm:w-auto lg:w-full">
              Open the live map <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <a href="mailto:hello@yoguide.com?subject=mallGuide%20pilot%20enquiry"
              className="inline-flex items-center justify-between gap-3 border border-white/20 text-white font-semibold text-sm px-5 py-3 rounded-lg hover:bg-white/10 transition-colors w-full sm:w-auto lg:w-full">
              Email us <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Floating concierge prompt — bottom-right teaser bubble */}
      <YoGuideFloatingTeaser />
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ n, label, tone = 'light' }: { n: string; label: string; tone?: 'light' | 'dark' }) {
  const num = tone === 'dark' ? 'text-white' : 'text-ink-900';
  const txt = tone === 'dark' ? 'text-white/60' : 'text-ink-400';
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.22em]">
      <span className={`font-bold ${num}`}>§ {n}</span>
      <span className="h-px w-6 bg-current opacity-40" />
      <span className={txt}>{label}</span>
    </div>
  );
}

