'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Package, ShieldCheck, Loader2, CheckCircle2, XCircle,
  Truck, Clock, Phone, MapPin,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

const STATUS_META: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  requested:   { label: 'Requested',    variant: 'amber' },
  accepted:    { label: 'Accepted',     variant: 'blue'  },
  picked_up:   { label: 'Picked up',    variant: 'blue'  },
  in_delivery: { label: 'On the way',   variant: 'blue'  },
  delivered:   { label: 'Delivered',    variant: 'amber' },
  paid:        { label: 'Paid',         variant: 'green' },
  returned:    { label: 'Returned',     variant: 'gray'  },
  cancelled:   { label: 'Cancelled',    variant: 'gray'  },
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const orderQ = trpc.orders.byId.useQuery({ id: orderId });

  const [payerPhone, setPayerPhone] = useState('');
  const [reason, setReason]         = useState('');
  const [err, setErr]               = useState<string | null>(null);

  const markPaid = trpc.orders.markPaid.useMutation({
    onSuccess: () => orderQ.refetch(),
    onError:   (e) => setErr(e.message),
  });
  const returnOrder = trpc.orders.returnRequest.useMutation({
    onSuccess: () => { setReason(''); orderQ.refetch(); },
    onError:   (e) => setErr(e.message),
  });

  if (orderQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><BrandedLoader size="lg" label="Loading order…" /></div>;
  }
  if (orderQ.error || !orderQ.data) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-500">Order not found.</div>;
  }
  const o = orderQ.data;
  const meta = STATUS_META[o.status] ?? { label: o.status, variant: 'gray' as const };

  const TIMELINE: Array<{ key: string; label: string; at: Date | string | null }> = [
    { key: 'requested',  label: 'Order placed',  at: o.requestedAt },
    { key: 'picked_up',  label: 'Picked up',     at: o.pickedUpAt  },
    { key: 'delivered',  label: 'Delivered',     at: o.deliveredAt },
    { key: 'paid',       label: 'Paid',          at: o.paidAt      },
    { key: 'returned',   label: 'Returned',      at: o.returnedAt  },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/orders" className="text-ink-500 hover:text-ink-900 flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> My orders
          </Link>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-5">
        {/* Product summary */}
        <section className="card p-5 flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-ink-100 overflow-hidden relative flex-shrink-0">
            {o.productImage ? (
              <Image src={o.productImage} alt={o.productName ?? ''} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-ink-300" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ink-900">{o.productName}</p>
            <p className="text-xs text-ink-500 mt-0.5">from {o.tenantName ?? 'Mall vendor'}</p>
            <p className="text-xs text-ink-400 mt-2 inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" strokeWidth={2.5} /> {o.shopperPhone}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={2.5} /> {o.deliveryAddress.slice(0, 50)}{o.deliveryAddress.length > 50 ? '…' : ''}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-400">Total if kept</p>
            <p className="text-lg font-extrabold tabular-nums text-ink-900">
              {Number(o.totalAmount).toLocaleString('en-RW')} {o.currency}
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-600" strokeWidth={2} /> Status
          </h2>
          <ol className="space-y-3">
            {TIMELINE.filter((s) => s.at || s.key === 'requested').map((step) => (
              <li key={step.key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.at ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-400'}`}>
                  {step.at ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Clock className="w-3 h-3" strokeWidth={2} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${step.at ? 'text-ink-900 font-semibold' : 'text-ink-500'}`}>{step.label}</p>
                  {step.at && <p className="text-[11px] text-ink-400">{new Date(step.at).toLocaleString('en-RW')}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Actions when delivered */}
        {o.status === 'delivered' && (
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-600" strokeWidth={2} /> Decision time
            </h2>
            <p className="text-xs text-ink-600 mb-4">
              The item is with you. Pay the full amount via MoMo to keep it, or return it for no extra charge (delivery fee non-refundable).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-ink-200 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Keep it</p>
                <p className="text-lg font-extrabold tabular-nums text-ink-900 mb-3">
                  {(Number(o.totalAmount) - Number(o.deliveryFee)).toLocaleString('en-RW')} {o.currency}
                </p>
                <input
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="MoMo phone"
                  className="input-base text-sm mb-2"
                />
                <button
                  onClick={() => markPaid.mutate({ id: o.id, payerPhone })}
                  disabled={!payerPhone || markPaid.isPending}
                  className="btn-primary w-full justify-center text-sm py-2"
                >
                  {markPaid.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Pay via MoMo
                </button>
              </div>

              <div className="border border-ink-200 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1">Return it</p>
                <p className="text-xs text-ink-500 mb-3">No further payment. The delivery person takes it back.</p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                  className="input-base text-sm mb-2"
                />
                <button
                  onClick={() => returnOrder.mutate({ id: o.id, reason: reason || undefined })}
                  disabled={returnOrder.isPending}
                  className="btn-secondary w-full justify-center text-sm py-2"
                >
                  {returnOrder.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Return order
                </button>
              </div>
            </div>

            {err && <p className="text-xs text-danger-700 mt-3">{err}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
