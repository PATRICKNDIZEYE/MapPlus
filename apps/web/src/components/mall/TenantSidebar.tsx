'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Package, BarChart3, ExternalLink, Wallet, TrendingUp, Sparkles, ShoppingBag } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';

const NAV = [
  { href: '/tenant',           icon: Store,       label: 'My Shop'    },
  { href: '/tenant/products',  icon: Package,     label: 'Products'   },
  { href: '/tenant/orders',    icon: ShoppingBag, label: 'Orders'     },
  { href: '/tenant/marketing', icon: Sparkles,    label: 'Go Social'  },
  { href: '/tenant/wallet',    icon: Wallet,      label: 'PiggyBox'   },
  { href: '/tenant/advance',   icon: TrendingUp,  label: 'RentAvance' },
  { href: '/tenant/analytics', icon: BarChart3,   label: 'Analytics'  },
];

export function TenantSidebar() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === '/tenant' ? path === '/tenant' : path.startsWith(href);

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar h-full flex flex-col overflow-hidden">
      <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3">
        <LogoMark className="w-9 h-9 flex-shrink-0" tone="light" />
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">
            mallGuide
          </p>
          <p className="text-xs text-white/40 mt-1">Tenant Hub</p>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-white/5">
        <div className="px-3 py-2.5 rounded-xl bg-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-black tracking-tighter">KF</span>
              </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">KFC CHIC</p>
            <p className="text-[10px] text-white/40">Ground Floor · G-A04</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
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

      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <Link href="/map/chic-kigali"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <ExternalLink className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>View on Map</span>
        </Link>
        <div className="mt-3 px-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">KF</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">KFC Manager</p>
              <p className="text-[10px] text-white/40">Tenant Staff</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
