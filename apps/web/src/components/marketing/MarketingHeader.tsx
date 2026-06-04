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
 * Landing-page header.
 *
 *   At the top of the page  → transparent, full-width, light copy so it
 *                              sits invisibly over the dark hero photo.
 *   Past the scroll threshold → morphs into a centred white "pill"
 *                              with a subtle border + shadow that floats
 *                              over the page like a sticky toolbar.
 *
 * Always position: fixed so the nav is always reachable.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Track scroll position so we can morph the header into a pill.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  // Light tone (white text) sits over the dark hero. Dark tone (ink text)
  // is for the pill once the user has scrolled past the hero.
  const dark = scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-out
          ${dark ? 'pt-3 sm:pt-4' : 'pt-0'}`}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-3 transition-all duration-300 ease-out
            ${dark
              ? 'max-w-3xl mx-3 sm:mx-auto h-12 sm:h-14 px-3 sm:px-4 rounded-full bg-white/95 backdrop-blur-md border border-ink-200 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)]'
              : 'max-w-7xl px-4 sm:px-6 h-16'}`}
        >
          <Logo size="sm" tone={dark ? 'primary' : 'light'} />

          {/* Desktop nav */}
          <nav className={`hidden md:flex items-center text-[13px] font-medium transition-all duration-300
            ${dark ? 'gap-0' : 'gap-0'}`}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 transition-colors
                  ${dark ? 'text-ink-600 hover:text-ink-900' : 'text-white/70 hover:text-white'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {/* Sign in — hidden on tiny screens to keep room for the CTA */}
            <Link
              href="/login"
              className={`hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 transition-colors
                ${dark ? 'text-ink-600 hover:text-ink-900' : 'text-white/80 hover:text-white'}`}
            >
              Sign in
            </Link>
            <a
              href="mailto:hello@yoguide.com?subject=mallGuide%20pilot%20enquiry"
              className={`inline-flex items-center gap-1.5 transition-colors text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-full whitespace-nowrap
                ${dark
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200'
                  : 'bg-white text-ink-900 hover:bg-ink-50 shadow-sm'}`}
            >
              Book a call
            </a>
            {/* Hamburger — mobile */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className={`md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors
                ${dark ? 'text-ink-700 hover:bg-ink-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
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
