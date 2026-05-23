/**
 * QR anchor landing page.
 * URL: /q/abc123
 * Resolves the short code → building + floor + anchor node,
 * then redirects to the map with the user's position pre-set.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ScanLine } from 'lucide-react';

interface QrPageProps {
  params: { code: string };
}

async function resolveQrCode(code: string) {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001';
  try {
    const res = await fetch(
      `${apiUrl}/trpc/routing.resolveQr?input=${encodeURIComponent(JSON.stringify({ shortCode: code }))}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json() as {
      result?: { data?: { buildingId: string; floorId: string; anchorNodeId: string; buildingName: string } };
    };
    return json.result?.data ?? null;
  } catch {
    return null;
  }
}

export default async function QrPage({ params }: QrPageProps) {
  const anchor = await resolveQrCode(params.code);

  if (!anchor) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-white border border-ink-200 shadow-sm flex items-center justify-center mx-auto mb-5">
            <ScanLine className="w-7 h-7 text-ink-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-base font-bold text-ink-900 mb-2">QR code not found</h1>
          <p className="text-sm text-ink-500 leading-relaxed mb-6">
            This QR code may be outdated, damaged, or invalid.
            Ask a building staff member for assistance.
          </p>
          <Link href="/" className="btn-secondary text-sm">
            Go to directory
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/map/${anchor.buildingId}?floor=${anchor.floorId}&from=${anchor.anchorNodeId}`);
}
