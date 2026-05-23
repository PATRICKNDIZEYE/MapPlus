import Link from 'next/link';
import {
  Map, Search, QrCode, BarChart3, Building2, Navigation,
  Users, Shield, ArrowRight, CheckCircle2,
  Store, LayoutDashboard, MapPin, ScanLine, Download,
} from 'lucide-react';

// ── Page data ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Map,
    title: 'Interactive floor maps',
    desc: 'PostGIS-backed unit polygons rendered with MapLibre GL JS. Every unit is a clickable entity with status, tenant, and spatial geometry.',
  },
  {
    icon: Search,
    title: 'Full-text search',
    desc: 'PostgreSQL FTS with pg_trgm fuzzy matching. Finds any shop, brand, or product in under 300 ms across all floors simultaneously.',
  },
  {
    icon: QrCode,
    title: 'QR-anchored navigation',
    desc: 'No GPS required. Visitors scan a QR code at any entrance and receive an exact position with turn-by-turn indoor routing.',
  },
  {
    icon: BarChart3,
    title: 'Building analytics',
    desc: 'Visitor heatmaps, search demand signals, and tenant performance data. Failed searches surface vacant unit leasing opportunities in real time.',
  },
  {
    icon: Store,
    title: 'Tenant self-service',
    desc: 'Each tenant manages their own profile, operating hours, and product listings without requiring admin intervention.',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    desc: 'Five permission levels from super admin to tenant staff. Every sensitive action is audit-logged with actor, entity, and timestamp.',
  },
];

const STEPS = [
  {
    n: '01',
    icon: Building2,
    title: 'Digitise the building',
    desc: 'We collect floor plans in any format — CAD, PDF, or physical walkthrough — and digitise every unit as a PostGIS polygon. Delivered in 5–10 business days.',
    meta: 'Field team + GIS specialist',
  },
  {
    n: '02',
    icon: Users,
    title: 'Onboard tenants',
    desc: 'Each tenant receives a login to manage their shop profile, hours, and product listings without requiring admin support.',
    meta: 'Self-service per tenant',
  },
  {
    n: '03',
    icon: ScanLine,
    title: 'Deploy QR codes',
    desc: 'Printable QR codes for every entrance, elevator, and key corridor. Visitors navigate without installing an app.',
    meta: 'Print-ready in minutes',
  },
];

const USE_CASES = [
  {
    role: 'Visitors',
    icon: Navigation,
    sub: 'Public web app · No installation required',
    items: [
      'Find any shop by name, brand, or product category',
      'Scan a QR code to anchor position and get directions',
      'Filter by floor, category, or operating hours',
      'Works offline after the first map load',
      'Report wrong or outdated shop information',
    ],
  },
  {
    role: 'Building managers',
    icon: LayoutDashboard,
    sub: 'Admin dashboard · Role-based access control',
    items: [
      'Real-time floor occupancy across all units',
      'Failed-search reports reveal unsatisfied tenant demand',
      'Tenant management with lease and contact records',
      'Map versioning: draft, publish, and archive',
      'QR anchor management and printable codes',
    ],
  },
  {
    role: 'Tenants',
    icon: Store,
    sub: 'Tenant portal · Fully self-managed',
    items: [
      'Edit shop name, description, and category',
      'Upload logo, cover photo, and product images',
      'Configure operating hours per day of week',
      'View profile visits, direction requests, and call clicks',
      'Manage product and services catalogue',
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-jakarta text-ink-900">

      {/* ── Navigation ── */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white border-b border-ink-200 h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary-600" strokeWidth={2.5} />
            <span className="text-base font-bold tracking-tight">Map+</span>
          </div>

          <nav className="hidden md:flex items-center">
            {[
              ['Features',     '#features'],
              ['How it works', '#how'],
              ['Use cases',    '#use'],
            ].map(([label, href]) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 text-sm text-ink-500 hover:text-ink-900 hover:bg-ink-50 rounded-md transition-colors font-medium">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/admin" className="btn-secondary text-xs py-1.5">
              Admin demo
            </Link>
            <Link href="/map/chic-kigali" className="btn-primary text-xs py-1.5">
              Open map <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Copy */}
          <div className="max-w-2xl mb-14">
            <div className="inline-flex items-center gap-2 bg-ink-50 border border-ink-200 text-ink-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-success-DEFAULT" />
              Live pilot — CHIC Kigali, Rwanda
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-[1.06] mb-6">
              The operating system<br />for large commercial buildings.
            </h1>

            <p className="text-lg text-ink-500 leading-relaxed mb-10 max-w-xl">
              Map+ turns building floor plans into searchable, navigable digital platforms.
              Visitors find what they need in seconds. Owners get the intelligence to manage and grow.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/map/chic-kigali" className="btn-primary text-base px-5 py-2.5">
                Explore live demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/admin" className="btn-secondary text-base px-5 py-2.5">
                <LayoutDashboard className="w-4 h-4" />
                Admin dashboard
              </Link>
            </div>
          </div>

          {/* Product mockup */}
          <div className="rounded-xl border border-ink-200 shadow-lg overflow-hidden bg-white">

            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 h-9 bg-ink-50 border-b border-ink-200">
              <div className="w-2.5 h-2.5 rounded-full bg-ink-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-ink-200" />
              <div className="ml-3 flex items-center gap-1.5 bg-white border border-ink-200 rounded px-2.5 py-1 text-[11px] text-ink-400 font-medium">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">map.plus/map/chic-kigali</span>
              </div>
            </div>

            {/* App layout */}
            <div className="flex h-[300px]">

              {/* Shop list sidebar */}
              <div className="w-52 border-r border-ink-100 flex flex-col flex-shrink-0 bg-white">
                <div className="px-3 py-2.5 border-b border-ink-100">
                  <div className="flex items-center gap-1.5 bg-ink-50 border border-ink-200 rounded-md px-2.5 py-1.5">
                    <Search className="w-3 h-3 text-ink-400 flex-shrink-0" strokeWidth={2} />
                    <span className="text-[11px] text-ink-400 font-medium">Search shops, brands…</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {['G', 'L1', 'L2'].map((f, i) => (
                      <div key={f}
                        className={`flex-1 py-1 rounded text-[10px] font-bold text-center
                          ${i === 0 ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-500'}`}>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-ink-50">
                  {[
                    ['KFC CHIC',         'Food & Beverages',  true ],
                    ['iStore Rwanda',    'Electronics',       false],
                    ['Royal Pharmacy',   'Health',            false],
                    ['Nakumatt Fashion', 'Fashion',           false],
                    ['Planet Fitness',   'Fitness',           false],
                    ['Cinemax Cinema',   'Entertainment',     false],
                  ].map(([name, cat, active]) => (
                    <div key={String(name)}
                      className={`flex items-start gap-2 px-3 py-2.5
                        ${active ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}>
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                        ${active ? 'bg-primary-100' : 'bg-ink-100'}`}>
                        <Store className={`w-3 h-3 ${active ? 'text-primary-600' : 'text-ink-400'}`} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold truncate
                          ${active ? 'text-primary-700' : 'text-ink-800'}`}>
                          {String(name)}
                        </p>
                        <p className="text-[10px] text-ink-400 truncate">{String(cat)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map area */}
              <div className="flex-1 bg-[#f1f4f8] relative overflow-hidden">
                {/* Grid background */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />

                {/* Unit polygons */}
                <div className="absolute inset-5 grid grid-cols-4 grid-rows-3 gap-2">
                  {[
                    { l: 'KFC CHIC',         span: 'col-span-1', active: true  },
                    { l: 'Simba Sports',                          active: false },
                    { l: 'Pharmacy',                              active: false },
                    { l: 'Airtel',                                active: false },
                    { l: 'iStore Rwanda',    span: 'col-span-2',  active: false },
                    { l: 'Dove Beauty',                           active: false },
                    { l: 'Vacant',                                vacant: true  },
                    { l: 'Samsung',          span: 'col-span-2',  active: false },
                    { l: 'Book Cafe',                             active: false },
                    { l: 'Vacant',                                vacant: true  },
                  ].map((u, i) => (
                    <div key={i}
                      className={`${u.span ?? ''} rounded-lg border-2 flex items-center justify-center p-1
                        ${u.active
                          ? 'bg-primary-50 border-primary-300 ring-1 ring-primary-200'
                          : u.vacant
                          ? 'bg-white border-dashed border-ink-200'
                          : 'bg-white border-ink-200'}`}>
                      <p className={`text-[9px] font-bold text-center leading-tight
                        ${u.active ? 'text-primary-700' : u.vacant ? 'text-ink-300' : 'text-ink-600'}`}>
                        {u.l}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Floor selector */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  {['L2', 'L1', 'G'].map((l, i) => (
                    <div key={l}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold
                        border shadow-xs
                        ${i === 2
                          ? 'bg-ink-900 text-white border-transparent'
                          : 'bg-white text-ink-600 border-ink-200'}`}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected shop row */}
            <div className="border-t border-ink-100 px-5 py-3 flex items-center gap-4 bg-white">
              <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-ink-500" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">KFC CHIC</p>
                <p className="text-xs text-ink-400">Ground Floor · Unit G-A04 · Open until 21:00</p>
              </div>
              <button className="btn-primary text-xs py-1 px-3">
                <Navigation className="w-3 h-3" /> Directions
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pilot stats bar ── */}
      <section className="py-10 px-6 bg-ink-50 border-y border-ink-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-1">
              Pilot deployment
            </p>
            <p className="text-base font-bold text-ink-900">CHIC Kigali — KG 9 Ave, Kacyiru</p>
            <p className="text-sm text-ink-500 mt-0.5">
              3 floors · 13 verified shops · 6 amenity types · QR anchors installed
            </p>
          </div>
          <div className="flex items-center gap-8 text-center flex-shrink-0">
            {[
              ['13',    'Shops'],
              ['3',     'Floors'],
              ['< 1 s', 'Search'],
              ['99.9%', 'Uptime'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-extrabold text-ink-900 tracking-tight">{v}</p>
                <p className="text-xs text-ink-400 font-medium mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-widest mb-3">
              Platform capabilities
            </p>
            <h2 className="text-4xl font-extrabold tracking-tighter mb-3">
              Built for the full stack of indoor intelligence
            </h2>
            <p className="text-ink-500 text-base max-w-xl leading-relaxed">
              One platform serving visitors, building managers, and tenants without compromise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-xl overflow-hidden">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white p-6 hover:bg-ink-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center mb-4">
                    <Icon className="w-[18px] h-[18px] text-primary-600" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-ink-900 mb-2 text-sm">{f.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 bg-ink-50 border-y border-ink-200">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-widest mb-3">
              Deployment process
            </p>
            <h2 className="text-4xl font-extrabold tracking-tighter">
              From floor plan to live product
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="card p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-ink-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <span className="text-5xl font-black text-ink-100 leading-none select-none">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="font-bold text-ink-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed mb-4">{step.desc}</p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-ink-400 bg-ink-50 border border-ink-200 px-2.5 py-1 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-DEFAULT" />
                    {step.meta}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section id="use" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-widest mb-3">
              Use cases
            </p>
            <h2 className="text-4xl font-extrabold tracking-tighter">
              Three products. One platform.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {USE_CASES.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.role} className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-ink-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink-900 text-sm">{card.role}</h3>
                      <p className="text-[11px] text-ink-400 font-medium">{card.sub}</p>
                    </div>
                  </div>
                  <ul className="px-5 py-5 space-y-3">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-ink-600">
                        <CheckCircle2 className="w-4 h-4 text-success-DEFAULT flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-ink-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold tracking-tighter text-white mb-4">
            Ready to digitise your building?
          </h2>
          <p className="text-ink-400 text-base mb-8 leading-relaxed max-w-xl mx-auto">
            Map+ is already live at CHIC Kigali. Explore the full demo — public map, admin dashboard,
            and tenant portal — before committing to anything.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/map/chic-kigali"
              className="inline-flex items-center gap-2 bg-white text-ink-900 font-bold text-sm px-6 py-3 rounded-lg hover:bg-ink-100 transition-colors shadow-xs">
              <Map className="w-4 h-4" strokeWidth={2} />
              Public map demo
            </Link>
            <Link href="/admin"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-white/20 transition-colors">
              <LayoutDashboard className="w-4 h-4" strokeWidth={2} />
              Admin dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-ink-400" strokeWidth={2} />
            <span className="text-sm font-bold text-ink-700">Map+</span>
            <span className="text-ink-200 mx-1">|</span>
            <span className="text-sm text-ink-400">Indoor Building Intelligence · Impactmel · Kigali, Rwanda</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-ink-400">
            <Link href="/admin"  className="hover:text-ink-700 transition-colors">Admin</Link>
            <Link href="/tenant" className="hover:text-ink-700 transition-colors">Tenant portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
