import { TenantSidebar } from '@/components/admin/TenantSidebar';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
