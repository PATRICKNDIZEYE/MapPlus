'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Map, LayoutDashboard, Users, BarChart3, QrCode,
  Settings, ExternalLink, Building2, ChevronDown, LogOut,
  Wallet, Receipt, AlertTriangle, Wrench, TrendingUp, ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { LogoMark } from '@/components/brand/Logo';

const ROLE_LABELS: Record<string, string> = {
  super_admin:        'Super admin',
  org_owner:          'Org owner',
  building_manager:   'Building manager',
  floor_manager:      'Floor manager',
  accounts:           'Accounts',
  security:           'Security',
  maintenance:        'Maintenance',
  tenant_admin:       'Tenant admin',
  tenant_staff:       'Tenant staff',
  delivery_personnel: 'Delivery',
  public:             'Public',
};

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: string[]; // empty => visible to all admin roles
};

// Role visibility — each nav item declares which roles can see it.
// 'super_admin' / 'org_owner' / 'building_manager' / 'floor_manager' have wide access;
// 'accounts' / 'security' / 'maintenance' see only their tools.
const ALL_ADMINS = ['super_admin', 'org_owner', 'building_manager', 'floor_manager'];

const NAV: NavItem[] = [
  { href: '/mall',             icon: LayoutDashboard, label: 'Overview',    roles: [...ALL_ADMINS, 'accounts', 'security', 'maintenance'] },
  { href: '/mall/units',       icon: Map,             label: 'Floor Maps',  roles: ALL_ADMINS },
  { href: '/mall/tenants',     icon: Users,           label: 'Tenants',     roles: [...ALL_ADMINS, 'accounts'] },
  { href: '/mall/rent',        icon: Wallet,          label: 'Rent Roll',   roles: [...ALL_ADMINS, 'accounts'] },
  { href: '/mall/advances',    icon: TrendingUp,      label: 'RentAvance',  roles: [...ALL_ADMINS, 'accounts'] },
  { href: '/mall/utilities',   icon: Receipt,         label: 'Utilities',   roles: [...ALL_ADMINS, 'accounts'] },
  { href: '/mall/incidents',   icon: AlertTriangle,   label: 'Incidents',   roles: [...ALL_ADMINS, 'security'] },
  { href: '/mall/maintenance', icon: Wrench,          label: 'Maintenance', roles: [...ALL_ADMINS, 'maintenance'] },
  { href: '/mall/analytics',   icon: BarChart3,       label: 'Analytics',   roles: ALL_ADMINS },
  { href: '/mall/qr',          icon: QrCode,          label: 'QR Codes',    roles: ALL_ADMINS },
];

export function MallSidebar() {
  const path = usePathname();
  const router = useRouter();
  const user  = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const isActive = (href: string) =>
    href === '/mall' ? path === '/mall' : path.startsWith(href);

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
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : '';

  function onSignOut() {
    clear();
    router.replace('/login');
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5 flex items-center gap-3">
        <LogoMark className="w-9 h-9 flex-shrink-0" tone="light" />
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">
            mallGuide
          </p>
          <p className="text-xs text-white/40 mt-1">Mall Management</p>
        </div>
      </div>

      {/* Building selector */}
      <div className="px-3 py-3 border-b border-white/5">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
          <div className="w-7 h-7 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary-300" strokeWidth={2} />
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
        {NAV.filter((item) => !user || item.roles.includes(user.role)).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
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
        {user?.role === 'super_admin' && (
          <Link href="/platform"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary-200 hover:text-white hover:bg-primary-600/30 transition-all">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            <span>Platform console</span>
          </Link>
        )}
        <Link href="/mall/settings"
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
        <div className="mt-3 px-3 pt-3 border-t border-white/5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-white/40 truncate">{roleLabel}</p>
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
