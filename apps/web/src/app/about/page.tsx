import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { Building2, MapPin, Users, Sparkles, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About mallGuide',
  description: 'mallGuide is an indoor building intelligence platform built by Impactmel in Kigali, Rwanda.',
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <article className="max-w-3xl mx-auto px-6 py-16">

        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 mb-3">About</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-5">
          We build software that turns buildings into platforms.
        </h1>
        <p className="text-lg text-ink-500 leading-relaxed mb-12 max-w-2xl">
          mallGuide is the operating system for commercial real estate — a search, navigation,
          and operations layer on top of a building. Built by Impactmel in Kigali.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink-200 border border-ink-200 rounded-xl overflow-hidden mb-14">
          <Stat icon={Building2} label="Pilot buildings" value="1" sub="CHIC Kigali" />
          <Stat icon={Users}     label="Shop profiles"  value="13" sub="Verified at launch" />
          <Stat icon={MapPin}    label="Geography"      value="Rwanda" sub="EU + EAC infrastructure" />
          <Stat icon={Sparkles}  label="Stack"          value="PostGIS · MapLibre · Next.js" sub="Indoor maps + analytics" />
        </div>

        <Section title="The problem">
          <p>
            Large commercial buildings — malls, hospitals, universities, airports — are
            functionally invisible to the internet. A visitor searching for a specific shop
            inside a mall finds the mall&apos;s name and address. Nothing inside is searchable.
          </p>
          <p>
            For owners and operators, this means demand signals never reach them. They have
            no idea what visitors are searching for, where they get lost, or which units
            convert browsing into footfall.
          </p>
        </Section>

        <Section title="What we built">
          <p>
            mallGuide digitises a building into a navigable, searchable digital twin. Floor plans
            become PostGIS polygons. Every unit is a record with status, tenant, geometry,
            and visibility. Visitors search by name, brand, or product category. Tenants
            manage their own profiles. Owners see operations data and demand intelligence
            their building has never produced before.
          </p>
        </Section>

        <Section title="Who we are">
          <p>
            Impactmel is a Rwandan technology company building infrastructure for the next
            generation of African commerce. mallGuide is our flagship product. The CHIC Kigali
            pilot is the first deployment; the next three buildings are in conversation.
          </p>
          <p>
            We are a team of seven — engineering, design, GIS, and field operations — split
            between Kigali and remote.
          </p>
        </Section>

        <div className="bg-ink-50 border border-ink-100 rounded-2xl px-6 py-8 mt-12 flex items-center gap-5 flex-wrap">
          <div className="flex-1 min-w-[16rem]">
            <h3 className="font-bold text-ink-900 mb-1">Talk to us about a pilot in your building</h3>
            <p className="text-sm text-ink-500">Typical deployment is 5–10 business days from floor plan to live product.</p>
          </div>
          <Link href="/contact" className="btn-primary text-sm py-2">
            Get in touch <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}

function Stat({
  icon: Icon, label, value, sub,
}: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      </div>
      <p className="text-xl font-extrabold tracking-tight text-ink-900">{value}</p>
      <p className="text-xs text-ink-400 mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold tracking-tight text-ink-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-ink-600 leading-relaxed">{children}</div>
    </section>
  );
}
