'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Package, ShoppingBag, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getShopperSessionId } from '@/lib/shopperSession';
import { Badge } from '@/components/ui/Badge';
import { AskYoGuideTrigger } from '@/components/aisearch/AskYoGuideTrigger';

const STATUS_META: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  requested:   { label: 'Requested',  variant: 'amber' },
  accepted:    { label: 'Accepted',   variant: 'blue'  },
  picked_up:   { label: 'Picked up',  variant: 'blue'  },
  in_delivery: { label: 'On the way', variant: 'blue'  },
  delivered:   { label: 'Delivered',  variant: 'amber' },
  paid:        { label: 'Paid',       variant: 'green' },
  returned:    { label: 'Returned',   variant: 'gray'  },
  cancelled:   { label: 'Cancelled',  variant: 'gray'  },
};

export default function MyOrdersPage() {
  const [sessionId, setSessionId] = useState<string>('');
  useEffect(() => { setSessionId(getShopperSessionId()); }, []);

  const orders = trpc.orders.byShopper.useQuery(
    { sessionId },
    { enabled: !!sessionId },
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/" className="text-ink-500 hover:text-ink-900 flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Home
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 mb-1">My orders</h1>
        <p className="text-sm text-ink-500 mb-6">Buy &amp; Try orders from your current device.</p>

        {!sessionId || orders.isLoading ? (
          <div className="text-center text-sm text-ink-500 py-10"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !orders.data?.length ? (
          <div className="card p-10 text-center">
            <ShoppingBag className="w-7 h-7 mx-auto text-ink-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-ink-700">No orders yet</p>
            <p className="text-xs text-ink-500 mt-1">Browse a shop and tap Buy &amp; Try to place your first order.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.data.map((o) => {
              const meta = STATUS_META[o.status] ?? { label: o.status, variant: 'gray' as const };
              return (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="card p-4 flex items-center gap-4 hover:border-primary-200 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-ink-100 overflow-hidden relative flex-shrink-0">
                      {o.productImage ? (
                        <Image src={o.productImage} alt={o.productName ?? ''} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{o.productName}</p>
                      <p className="text-xs text-ink-500">{o.tenantName} · {new Date(o.requestedAt).toLocaleDateString('en-RW')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <p className="text-sm font-bold tabular-nums text-ink-900 mt-1">
                        {Number(o.totalAmount).toLocaleString('en-RW')} {o.currency}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AskYoGuideTrigger />
    </div>
  );
}
