'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { PlatformSidebar } from '@/components/platform/PlatformSidebar';
import { BrandedLoader } from '@/components/ui/BrandedLoader';
import { useAuthStore } from '@/store/auth.store';

/**
 * Platform console layout — super_admin only. Anyone else who hits /platform/*
 * gets bounced to /mall (or /tenant) instead.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      const redirect = encodeURIComponent(pathname || '/platform');
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (user && user.role !== 'super_admin') {
      router.replace('/mall');
    }
  }, [accessToken, user, hydrated, pathname, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <BrandedLoader size="lg" label="Loading console…" />
      </div>
    );
  }
  if (user && user.role !== 'super_admin') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <ShieldAlert className="w-7 h-7 mx-auto text-danger-700 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-ink-900">Restricted area</p>
          <p className="text-xs text-ink-500 mt-1">The platform console is for mallGuide staff only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
