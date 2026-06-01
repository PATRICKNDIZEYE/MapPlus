'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const NAV = [
  { label: 'Product',   href: '#product'  },
  { label: 'Pilot',     href: '#pilot'    },
  { label: 'Process',   href: '#process'  },
  { label: 'Audiences', href: '#audiences'},
];

/**
 * Landing-page header. Sits on top of the indigo hero gradient.
 *
 * On mobile (< md) it collapses the nav into a hamburger that opens
 * a full-height overlay. The CTA chip ("Book a call") stays visible
 * at all sizes so visitors always have a one-tap call-to-action.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  return (
    <>
      <header className="absolute top-0 inset-x-0 z-40 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-2">
          <Logo size="sm" tone="light" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center text-[13px] font-medium">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}
                className="px-3 py-1.5 text-white/70 hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Sign in — hidden on the tiniest screens to keep room for the primary CTA */}
            <Link href="/login" className="hidden sm:inline-flex text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5">
              Sign in
            </Link>
            <a href="mailto:hello@yoguide.com?subject=mallGuide%20pilot%20enquiry"
               className="inline-flex items-center gap-1.5 bg-white text-ink-900 hover:bg-ink-50 transition-colors text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-full shadow-sm whitespace-nowrap">
              Book a call
            </a>
            {/* Hamburger — visible on mobile only */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink-900/95 backdrop-blur-sm flex flex-col">
          <div className="max-w-7xl mx-auto w-full px-4 h-16 flex items-center justify-between flex-shrink-0">
            <Logo size="sm" tone="light" href={null} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          <nav className="flex-1 flex flex-col items-stretch gap-1 px-4 pt-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}
                onClick={() => setOpen(false)}
                className="text-white text-2xl font-extrabold tracking-tight py-3 border-b border-white/10">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 pb-8 flex flex-col gap-2 flex-shrink-0">
            <Link href="/login"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm py-3 rounded-full">
              Sign in
            </Link>
            <a href="mailto:hello@yoguide.com?subject=mallGuide%20pilot%20enquiry"
              className="inline-flex items-center justify-center bg-white text-ink-900 hover:bg-ink-50 font-semibold text-sm py-3 rounded-full">
              Book a call
            </a>
          </div>
        </div>
      )}
    </>
  );
}
