'use client';

import { useState } from 'react';
import {
  ShoppingBag, Loader2, CheckCircle2, Truck, Package, MapPin, Phone,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';

const STATUS_VALUES = [
  'requested', 'accepted', 'picked_up', 'in_delivery',
  'delivered', 'paid', 'returned', 'cancelled',
] as const;

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

export default function TenantOrdersPage() {
  const [filter, setFilter] = useState<string>('');
  const orders = trpc.orders.byTenant.useQuery(
    filter ? { status: filter as typeof STATUS_VALUES[number] } : undefined,
  );
  const accept = trpc.orders.acceptByTenant.useMutation({ onSuccess: () => orders.refetch() });
  const deliver = trpc.orders.markDelivered.useMutation({ onSuccess: () => orders.refetch() });

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Orders</h1>
          <p className="text-sm text-ink-500 mt-1">Buy &amp; Try orders from shoppers — accept, then hand off to delivery.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-base text-sm py-1.5 px-3"
        >
          <option value="">All statuses</option>
          {STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_META[s]!.label}</option>)}
        </select>
      </header>

      <div className="card overflow-hidden">
        {orders.isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : !orders.data?.length ? (
          <div className="px-5 py-12 text-center text-sm text-ink-500">
            <ShoppingBag className="w-6 h-6 mx-auto text-ink-300 mb-2" strokeWidth={1.5} />
            No orders yet.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {orders.data.map((o) => {
              const meta = STATUS_META[o.status] ?? { label: o.status, variant: 'gray' as const };
              return (
                <li key={o.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-primary-600" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-ink-900">{o.productName}</p>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-ink-500 inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" strokeWidth={2.5} /> {o.shopperName} · {o.shopperPhone}
                        </span>
                      </p>
                      <p className="text-xs text-ink-500 mt-0.5 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" strokeWidth={2.5} /> {o.deliveryAddress}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-1">
                        Qty {o.quantity} · {new Date(o.requestedAt).toLocaleString('en-RW')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold tabular-nums text-ink-900">
                        {Number(o.totalAmount).toLocaleString('en-RW')} {o.currency}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5">
                        Delivery {Number(o.deliveryFee).toLocaleString('en-RW')}
                      </p>
                      <div className="mt-2 flex flex-col items-end gap-1">
                        {o.status === 'requested' && (
                          <button
                            onClick={() => accept.mutate({ id: o.id })}
                            disabled={accept.isPending}
                            className="text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1"
                          >
                            {accept.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Accept
                          </button>
                        )}
                        {o.status === 'accepted' && (
                          <button
                            onClick={() => deliver.mutate({ id: o.id })}
                            disabled={deliver.isPending}
                            className="text-xs font-semibold text-success-700 hover:text-success-700/80 inline-flex items-center gap-1"
                          >
                            {deliver.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                            Mark delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
