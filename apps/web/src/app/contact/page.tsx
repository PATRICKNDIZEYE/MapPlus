import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { Mail, Phone, MapPin, Building2, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — mallGuide',
  description: 'Talk to the mallGuide team about deploying the mall-guide ecosystem in your building.',
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <article className="max-w-3xl mx-auto px-6 py-16">

        <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 mb-3">Contact</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-4">Talk to our team.</h1>
        <p className="text-lg text-ink-500 leading-relaxed mb-10 max-w-2xl">
          Considering mallGuide for your mall or commercial complex?
          Pick the channel that suits you — we usually respond within one business day.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">

          <Tile
            icon={Mail}
            label="Email"
            value="hello@impactmel.com"
            href="mailto:hello@impactmel.com?subject=mallGuide%20enquiry"
            sub="General enquiries and partnerships"
          />

          <Tile
            icon={MessageCircle}
            label="WhatsApp"
            value="+250 788 000 000"
            href="https://wa.me/250788000000"
            sub="Fastest channel — usually under 2h"
          />

          <Tile
            icon={Phone}
            label="Phone"
            value="+250 252 000 000"
            href="tel:+250252000000"
            sub="Mon–Fri · 09:00 – 18:00 (CAT)"
          />

          <Tile
            icon={Building2}
            label="Sales / pilots"
            value="pilots@impactmel.com"
            href="mailto:pilots@impactmel.com?subject=Pilot%20enquiry"
            sub="Building owners and operators"
          />
        </div>

        <div className="card overflow-hidden">
          <div className="card-header py-4">
            <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-ink-400" strokeWidth={2} /> Office
            </h2>
          </div>
          <div className="px-6 py-5 text-sm text-ink-600 leading-relaxed">
            <p className="font-semibold text-ink-900">Impactmel Ltd</p>
            <p>Nyarugenge, downtown Kigali</p>
            <p>Rwanda</p>
            <p className="mt-3 text-xs text-ink-400">
              Pilot deployment live at CHIC Kigali — <Link href="/map/chic-kigali" className="text-primary-600 hover:text-primary-700 font-semibold">open the public map</Link>.
            </p>
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}

function Tile({
  icon: Icon, label, value, href, sub,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string; value: string; href: string; sub: string;
}) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener"
       className="card p-5 hover:border-ink-300 hover:shadow-sm transition-all block">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      </div>
      <p className="text-base font-bold text-ink-900 tracking-tight">{value}</p>
      <p className="text-xs text-ink-400 mt-1">{sub}</p>
    </a>
  );
}
