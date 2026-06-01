'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store, Package, ExternalLink, Wallet, TrendingUp, Sparkles, ShoppingBag,
  Settings, LogOut,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { useAuthStore } from '@/store/auth.store';
import { trpc } from '@/lib/trpc';

const NAV = [
  { href: '/tenant',           icon: Store,       label: 'My Shop'    },
  { href: '/tenant/products',  icon: Package,     label: 'Products'   },
  { href: '/tenant/orders',    icon: ShoppingBag, label: 'Orders'     },
  { href: '/tenant/marketing', icon: Sparkles,    label: 'Go Social'  },
  { href: '/tenant/wallet',    icon: Wallet,      label: 'PiggyBox'   },
  { href: '/tenant/advance',   icon: TrendingUp,  label: 'RentAvance' },
];

export function TenantSidebar() {
  const path   = usePathname();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const clear  = useAuthStore((s) => s.clear);

  // Real tenant context from the logged-in user.
  const { data: myShops } = trpc.shops.mine.useQuery(undefined, { enabled: !!user });
  const shop = myShops?.[0] ?? null;

  const isActive = (href: string) =>
    href === '/tenant' ? path === '/tenant' : path.startsWith(href);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '—';
  const initials = (() => {
    if (shop?.publicName) return shop.publicName.slice(0, 2).toUpperCase();
    if (user?.firstName)  return (user.firstName.charAt(0) + (user.lastName?.charAt(0) ?? '')).toUpperCase();
    return user?.email?.charAt(0).toUpperCase() ?? '—';
  })();

  function onSignOut() {
    clear();
    router.replace('/login');
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar h-full flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3">
        <LogoMark size={36} tone="light" />
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">mallGuide</p>
          <p className="text-xs text-white/40 mt-1">Tenant Hub</p>
        </div>
      </div>

      {/* Shop chip — real tenant context */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="px-3 py-2.5 rounded-xl bg-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {shop?.publicName ?? 'No shop linked'}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {shop ? `${shop.floorName ?? ''}${shop.unitCode ? ` · ${shop.unitCode}` : ''}` : 'Contact your mall admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active ? 'bg-primary-600 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — settings, public map link, user + sign out */}
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <Link href="/tenant/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>Settings</span>
        </Link>
        <Link href="/map/chic-kigali"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <ExternalLink className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>View on Map</span>
        </Link>

        {/* User + sign out */}
        <div className="mt-3 px-3 pt-3 border-t border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.role === 'tenant_admin' ? 'Tenant admin' : 'Tenant staff'}</p>
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
