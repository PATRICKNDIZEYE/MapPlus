'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MallSidebar } from '@/components/mall/MallSidebar';
import { useAuthStore } from '@/store/auth.store';

export default function MallLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      const redirect = encodeURIComponent(pathname || '/mall');
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [accessToken, hydrated, pathname, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <MallSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
