'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Settings, BarChart3, ChevronDown, LogOut,
  ArrowRightLeft, ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { LogoMark } from '@/components/brand/Logo';

const NAV = [
  { href: '/platform',            icon: LayoutDashboard, label: 'Overview'    },
  { href: '/platform/orgs',       icon: Building2,       label: 'Orgs & Malls' },
  { href: '/platform/settlement', icon: BarChart3,       label: 'Settlement'   },
  { href: '/platform/config',     icon: Settings,        label: 'Platform Config' },
];

/**
 * Sidebar for super_admin (Impactmel staff) — running the SaaS itself.
 * Distinct from MallSidebar which is for building owners running one mall.
 */
export function PlatformSidebar() {
  const path = usePathname();
  const router = useRouter();
  const user  = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const isActive = (href: string) =>
    href === '/platform' ? path === '/platform' : path.startsWith(href);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '—';
  const initials = (() => {
    if (!user) return '–';
    const f = user.firstName?.charAt(0) ?? '';
    const l = user.lastName?.charAt(0) ?? '';
    const combined = (f + l).toUpperCase();
    return combined || user.email.charAt(0).toUpperCase();
  })();

  function onSignOut() {
    clear();
    router.replace('/login');
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3">
        <LogoMark size={36} tone="light" />
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">
            mallGuide
          </p>
          <p className="text-xs text-white/40 mt-1">Platform Console</p>
        </div>
      </div>

      {/* Role banner */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="px-3 py-2 rounded-xl bg-primary-600/15 flex items-center gap-2.5">
          <ShieldAlert className="w-3.5 h-3.5 text-primary-300 flex-shrink-0" strokeWidth={2} />
          <p className="text-[11px] font-semibold text-primary-100 leading-tight">
            Impactmel staff · super_admin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-primary-600 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-300 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <Link href="/mall"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <ArrowRightLeft className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>Switch to mall</span>
        </Link>

        <div className="mt-3 px-3 pt-3 border-t border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-white/40 truncate">Super admin</p>
          </div>
          <button
            onClick={onSignOut}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
