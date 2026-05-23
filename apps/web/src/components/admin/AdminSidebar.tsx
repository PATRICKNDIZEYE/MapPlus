'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map, LayoutDashboard, Users, BarChart3, QrCode,
  Settings, ExternalLink, Building2, ChevronDown,
} from 'lucide-react';

const NAV = [
  { href: '/admin',           icon: LayoutDashboard, label: 'Overview'  },
  { href: '/admin/units',     icon: Map,             label: 'Floor Maps' },
  { href: '/admin/tenants',   icon: Users,           label: 'Tenants'   },
  { href: '/admin/analytics', icon: BarChart3,       label: 'Analytics' },
  { href: '/admin/qr',        icon: QrCode,          label: 'QR Codes'  },
];

export function AdminSidebar() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href);

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Map className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Map+</p>
          <p className="text-xs text-white/40 mt-0.5">Admin Console</p>
        </div>
      </div>

      {/* Building selector */}
      <div className="px-3 py-3 border-b border-white/5">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">CHIC Kigali</p>
            <p className="text-[10px] text-white/40">3 floors · 13 shops</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                ${active
                  ? 'bg-blue-600 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <Link href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>Settings</span>
        </Link>
        <Link href="/map/chic-kigali"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
          <ExternalLink className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>Public Map</span>
        </Link>

        {/* User */}
        <div className="mt-3 px-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              CM
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">CHIC Manager</p>
              <p className="text-[10px] text-white/40">Building Manager</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
