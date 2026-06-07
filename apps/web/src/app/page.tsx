'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Layers, Store, ArrowRight, QrCode, Search, Navigation } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { trpc } from '@/lib/trpc';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

export default function HomePage() {
  const { data: buildings, isLoading } = trpc.buildings.list.useQuery();

  return (
    <div className="min-h-screen bg-white font-jakarta text-ink-900 flex flex-col">

      {/* ── Header ── */}
      <header className="absolute top-0 left-0 right-0 z-30 h-16 flex items-center px-6 sm:px-10">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <span className="text-white font-extrabold tracking-tight text-base leading-none">
            yoGuide
          </span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-32 sm:py-44"
        style={{ background: 'linear-gradient(135deg, #1A0030 0%, #0f172a 60%, #28004A 100%)' }}
      >
        {/* Glow blobs */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(107,43,161,0.28) 0%, transparent 70%)', top: '-80px' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(75,0,130,0.18) 0%, transparent 70%)', bottom: '-40px', right: '-40px' }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-300 mb-6 px-3 py-1.5 rounded-full border border-primary-700/50 bg-primary-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · CHIC Kigali
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter leading-[1.04] text-white mb-5">
            Find any shop
            <span
              className="block"
              style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(90deg, #A875D2, #C9A4E5)' }}
            >
              inside the mall.
            </span>
          </h1>

          <p className="text-ink-300 text-base sm:text-lg max-w-md mx-auto leading-relaxed mb-8">
            Scan the QR code at any entrance, search for what you need, and walk there with a live route on the real floor plan.
          </p>

          <button
            onClick={() => document.getElementById('malls')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-primary-900/30 hover:-translate-y-0.5"
          >
            <Navigation className="w-4 h-4" strokeWidth={2.5} />
            Open the map
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
      </section>

      {/* ── How it works ── */}
      <section className="py-16 sm:py-20 px-6 sm:px-10 max-w-5xl mx-auto w-full">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-400 mb-10 text-center">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          <HowStep
            n="1"
            icon={<QrCode className="w-5 h-5" strokeWidth={2} />}
            title="Scan QR at the entrance"
            body="Every entrance has a QR code. Scan it and the map knows exactly where you are."
          />
          <HowStep
            n="2"
            icon={<Search className="w-5 h-5" strokeWidth={2} />}
            title="Search any shop or brand"
            body="Type a name, a brand, or just what you're looking for — shoes, food, pharmacy. Results are instant."
          />
          <HowStep
            n="3"
            icon={<Navigation className="w-5 h-5" strokeWidth={2} />}
            title="Follow the route"
            body="A live route is drawn on the real floor plan from your door to the shop, floor by floor."
          />
        </div>
      </section>

      {/* ── Buildings ── */}
      <section id="malls" className="bg-ink-50/50 border-y border-ink-100 py-14 sm:py-18 px-6 sm:px-10 flex-1">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-400 mb-8">Available malls</p>

          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <BrandedLoader size="md" label="Loading malls…" />
            </div>
          )}

          {!isLoading && (!buildings || buildings.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-ink-400 text-sm gap-3">
              <Store className="w-10 h-10 text-ink-200" strokeWidth={1.5} />
              <p>No malls available yet.</p>
            </div>
          )}

          {buildings && buildings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {buildings.map((b) => (
                <Link
                  key={b.id}
                  href={`/map/${b.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-ink-100 shadow-sm hover:shadow-lg hover:border-primary-200 hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  {/* Photo */}
                  <div className="relative h-48 bg-ink-100 flex-shrink-0 overflow-hidden">
                    {b.coverPhotoUrl ? (
                      <Image
                        src={b.coverPhotoUrl}
                        alt={b.name}
                        fill
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A0030, #4B0082)' }}>
                        <Store className="w-12 h-12 text-primary-400" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <h3 className="text-white font-extrabold text-base tracking-tight leading-tight drop-shadow-sm">
                        {b.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 flex-shrink-0 ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col gap-2.5">
                    <div className="flex items-center gap-4 text-[11px] text-ink-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-ink-400" strokeWidth={2} />
                        {b.city}, {b.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-ink-400" strokeWidth={2} />
                        {b.floorsCount} floor{b.floorsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {b.description && (
                      <p className="text-xs text-ink-500 leading-relaxed line-clamp-2">{b.description}</p>
                    )}

                    <div className="mt-auto pt-1 flex items-center gap-1.5 text-xs font-bold text-primary-600 group-hover:gap-2.5 transition-all">
                      Open map <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-100 bg-white py-8 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-400">
          <div className="flex items-center gap-3">
            <LogoMark size={28} />
            <span className="font-semibold text-ink-600">yoGuide</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <Link href="/about"   className="hover:text-ink-700 transition-colors">About</Link>
            <Link href="/contact" className="hover:text-ink-700 transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-ink-700 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-ink-700 transition-colors">Terms</Link>
          </div>
          <span>© {new Date().getFullYear()} yoGuide Ltd · Kigali, Rwanda</span>
        </div>
      </footer>
    </div>
  );
}

function HowStep({ n, icon, title, body }: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="relative">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ background: 'linear-gradient(135deg, #4B0082, #6B2BA1)' }}
        >
          {icon}
        </div>
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-ink-200 text-[10px] font-extrabold text-ink-500 flex items-center justify-center shadow-xs">
          {n}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink-900 mb-1.5">{title}</h3>
        <p className="text-xs text-ink-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
