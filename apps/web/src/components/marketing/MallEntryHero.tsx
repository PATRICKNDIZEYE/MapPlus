'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, Sparkles, Search, MapPin } from 'lucide-react';

// Cinematic background for the landing — modern multi-storey mall interior.
// Already in next.config remotePatterns under images.unsplash.com.
const HERO_PHOTO = 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=2000&q=85';

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: '530',  label: 'shops mapped' },
  { value: '5',    label: 'floors' },
  { value: '8',    label: 'categories' },
  { value: '~300ms', label: 'search latency' },
];

/**
 * "Open the mall" hero — replaces the marketing-first landing with a
 * shopper-facing entrance. Built so the first thing a visitor sees is
 * the live mall they can walk into.
 */
export function MallEntryHero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-ink-900">

      {/* Background photo */}
      <Image
        src={HERO_PHOTO}
        alt="Inside CHIC Kigali"
        fill
        priority
        className="object-cover object-center scale-105"
        sizes="100vw"
      />

      {/* Bottom-up dark gradient — keeps copy legible without dimming the
          atrium architecture in the top third. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />

      {/* Indigo brand wash — ties the whole hero to the rest of the app */}
      <div aria-hidden className="absolute inset-0 mix-blend-multiply"
        style={{
          background: 'linear-gradient(135deg, rgba(40,0,74,0.45) 0%, rgba(75,0,130,0.20) 40%, transparent 70%, rgba(75,0,130,0.30) 100%)',
        }}
      />

      {/* Soft top vignette so the header pill stands out */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Hero copy — vertically centred in the full viewport */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">

          {/* Live pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-[10px] font-bold uppercase tracking-[0.18em] mb-6 shadow-lg shadow-black/20">
            <span className="relative flex items-center justify-center w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-success-400 animate-ping opacity-75" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-success-400" />
            </span>
            Live · CHIC Kigali · Open now
          </div>

          <h1 className="text-white text-[40px] sm:text-[64px] lg:text-[88px] font-extrabold tracking-tighter leading-[0.95] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
            Step into
            <br />
            <span className="bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent">
              the whole mall.
            </span>
          </h1>

          <p className="mt-5 sm:mt-7 text-white/85 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Browse <span className="font-bold text-white">530 shops</span> across five floors of CHIC Kigali.
            Search anything, pick your entrance, get turn-by-turn directions on the floor plan itself.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/map/chic-kigali"
              className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-b from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-full shadow-[0_8px_24px_-6px_rgba(75,0,130,0.65)] hover:shadow-[0_14px_32px_-6px_rgba(75,0,130,0.8)] hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
              Open the mall
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
            <Link
              href="#owners"
              className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/25 hover:border-white/40 text-white font-semibold text-sm px-5 py-3.5 rounded-full transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              For property owners
            </Link>
          </div>

          {/* Stat row — glass capsule */}
          <div className="mt-10 sm:mt-14 inline-flex items-stretch flex-wrap justify-center gap-px bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-1 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.4)]">
            {STATS.map((s) => (
              <div key={s.label} className="px-4 sm:px-5 py-2 sm:py-2.5 text-center rounded-xl">
                <p className="text-white text-base sm:text-lg font-extrabold tabular-nums leading-none">{s.value}</p>
                <p className="text-white/65 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick-use chips — what you can actually do once inside */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-white/75">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 backdrop-blur">
              <Search className="w-3 h-3" strokeWidth={2.5} /> Search any shop
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 backdrop-blur">
              <MapPin className="w-3 h-3" strokeWidth={2.5} /> Pick your entrance
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 backdrop-blur">
              <ArrowRight className="w-3 h-3" strokeWidth={2.5} /> Walk to your shop
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
