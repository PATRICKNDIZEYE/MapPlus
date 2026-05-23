'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Package, ShieldCheck, Loader2, AlertCircle, ShoppingBag,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getShopperSessionId } from '@/lib/shopperSession';

const DELIVERY_FEE = 1500;

export default function CheckoutPage() {
  const { shopId, productId } = useParams<{ shopId: string; productId: string }>();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string>('');
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [address, setAddress]     = useState('');
  const [notes, setNotes]         = useState('');
  const [err, setErr]             = useState<string | null>(null);

  useEffect(() => { setSessionId(getShopperSessionId()); }, []);

  const productQ = trpc.products.byId.useQuery({ id: productId });

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (order) => router.push(`/orders/${order.id}?session=${sessionId}`),
    onError:   (e) => setErr(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErr('Name, phone, and delivery address are required.');
      return;
    }
    createOrder.mutate({
      productId,
      shopperSessionId: sessionId,
      shopperName:  name.trim(),
      shopperPhone: phone.trim(),
      payerPhone:   (payerPhone || phone).trim(),
      deliveryAddress: address.trim(),
      deliveryNotes:   notes.trim() || undefined,
    });
  }

  if (productQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-500">Loading…</div>;
  }
  if (productQ.error || !productQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <AlertCircle className="w-7 h-7 mx-auto text-ink-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-ink-700">Product not found</p>
          <Link href="/" className="text-xs font-semibold text-primary-700 mt-3 inline-block">Back home</Link>
        </div>
      </div>
    );
  }

  const p = productQ.data;
  const unitPrice  = Number(p.priceAmount ?? 0);
  const total      = unitPrice + DELIVERY_FEE;
  const currency   = p.currency ?? 'RWF';

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href={`/shop/${shopId}`} className="text-ink-500 hover:text-ink-900 flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Back to shop
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Form */}
        <form onSubmit={submit} className="card p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900 mb-2">Buy &amp; Try checkout</h1>
          <p className="text-sm text-ink-500 mb-5">
            Pay only the delivery fee now. You inspect the item on delivery and pay the full price only if you keep it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Your name" required>
              <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
            </Field>
            <Field label="Phone (delivery contact)" required>
              <input className="input-base" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={50} required />
            </Field>
          </div>

          <Field label="Delivery address" required>
            <textarea
              className="input-base min-h-[80px]"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={1000}
              placeholder="Street, neighbourhood, landmark…"
              required
            />
          </Field>

          <Field label="Delivery notes (optional)">
            <input className="input-base" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </Field>

          <div className="mt-4 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-primary-900 leading-relaxed">
              You only pay <strong>{DELIVERY_FEE.toLocaleString('en-RW')} {currency}</strong> for delivery now via MTN MoMo.
              Pay the product price only if you keep it on delivery.
            </p>
          </div>

          <Field label="MoMo phone for delivery fee (defaults to delivery contact)">
            <input
              className="input-base"
              type="tel"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder={phone || '+250…'}
              maxLength={50}
            />
          </Field>

          {err && (
            <div className="mt-3 flex items-start gap-2 bg-danger-50 border border-danger-100 text-danger-700 text-xs px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>{err}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={createOrder.isPending}
            className="btn-primary w-full justify-center text-sm py-2.5 mt-5"
          >
            {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            Pay delivery fee &amp; order
          </button>
        </form>

        {/* Summary */}
        <aside className="card p-5 h-fit lg:sticky lg:top-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-3">Order summary</p>
          <div className="flex items-start gap-3 pb-4 border-b border-ink-100">
            <div className="w-14 h-14 rounded-lg bg-ink-100 overflow-hidden relative flex-shrink-0">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-ink-300" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 leading-tight">{p.name}</p>
              {p.category && <p className="text-xs text-ink-500 mt-0.5">{p.category}</p>}
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Item price" value={`${unitPrice.toLocaleString('en-RW')} ${currency}`} />
            <Row label="Delivery fee" value={`${DELIVERY_FEE.toLocaleString('en-RW')} ${currency}`} tone="primary" sub="Payable now" />
            <div className="border-t border-ink-100 pt-2 mt-3">
              <Row label="If you keep it" value={`${total.toLocaleString('en-RW')} ${currency}`} bold sub="Paid on delivery" />
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
        {label}{required && <span className="text-danger-700 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, tone, sub, bold }: { label: string; value: string; tone?: 'primary'; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <p className={`${bold ? 'font-bold text-ink-900' : 'text-ink-600'}`}>{label}</p>
        {sub && <p className="text-[11px] text-ink-400">{sub}</p>}
      </div>
      <p className={`tabular-nums ${tone === 'primary' ? 'text-primary-700' : ''} ${bold ? 'font-bold text-ink-900' : 'text-ink-900'}`}>{value}</p>
    </div>
  );
}
