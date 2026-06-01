import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

const PRODUCT = [
  { label: 'Live map',       href: '/map/chic-kigali' },
  { label: 'Tenant portal',  href: '/tenant' },
  { label: 'Sign in',        href: '/login' },
];

const COMPANY = [
  { label: 'About',   href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const LEGAL = [
  { label: 'Privacy',  href: '/privacy' },
  { label: 'Terms',    href: '/terms' },
];

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-ink-200">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">

        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-10">

          {/* Brand */}
          <div className="col-span-2">
            <div className="mb-3">
              <Logo size="sm" />
            </div>
            <p className="text-sm text-ink-500 leading-relaxed max-w-sm">
              Indoor building intelligence for commercial real estate.
              Built by yoGuide in Kigali, Rwanda.
            </p>
            <p className="text-xs text-ink-400 mt-4">
              <a href="mailto:hello@yoguide.com" className="hover:text-ink-700 transition-colors">
                hello@yoguide.com
              </a>
              <span className="mx-2 text-ink-200">·</span>
              <a href="tel:+250252000000" className="hover:text-ink-700 transition-colors">
                +250 252 000 000
              </a>
            </p>
          </div>

          <Column title="Product" links={PRODUCT} />
          <Column title="Company" links={COMPANY} />
          <Column title="Legal"   links={LEGAL} />
        </div>

        <div className="pt-6 border-t border-ink-100 flex items-center justify-between gap-4 flex-wrap text-xs text-ink-400">
          <span>© {new Date().getFullYear()} yoGuide Ltd · Nyarugenge, downtown Kigali · Rwanda</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success-DEFAULT" />
            Pilot live at CHIC Kigali
          </span>
        </div>
      </div>
    </footer>
  );
}

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-600 hover:text-ink-900 transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
