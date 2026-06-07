import Link from 'next/link';
import { SiteFooter } from './SiteFooter';
import { Logo } from '@/components/brand/Logo';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white font-jakarta text-ink-900">

      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-200 h-14">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Logo size="sm" />

          <nav className="hidden md:flex items-center">
            {[
              ['Home',    '/'],
              ['About',   '/about'],
              ['Contact', '/contact'],
            ].map(([label, href]) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 text-sm text-ink-500 hover:text-ink-900 hover:bg-ink-50 rounded-md transition-colors font-medium">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}
