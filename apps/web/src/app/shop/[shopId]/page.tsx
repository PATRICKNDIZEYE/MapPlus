'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Package, Search, ShoppingBag, Phone, MessageCircle, MapPin, Clock,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { AskYoGuideTrigger } from '@/components/aisearch/AskYoGuideTrigger';

export default function ShopStorefrontPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [query, setQuery] = useState('');

  const shop = trpc.shops.byId.useQuery({ id: shopId });
  const productsQ = trpc.products.listByShop.useQuery({ shopId });

  const filtered = useMemo(() => {
    const list = productsQ.data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q)
      || (p.description ?? '').toLowerCase().includes(q)
      || (p.category ?? '').toLowerCase().includes(q),
    );
  }, [productsQ.data, query]);

  if (shop.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-500">Loading…</div>;
  }
  if (shop.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <Package className="w-7 h-7 mx-auto text-ink-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-ink-700">Shop not found</p>
          <p className="text-xs text-ink-500 mt-1">{shop.error.message}</p>
          <Link href="/" className="text-xs font-semibold text-primary-700 mt-3 inline-block">Back home</Link>
        </div>
      </div>
    );
  }

  const s = shop.data!;
  const heroSrc = s.coverPhotoUrl
    ?? 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=1600&q=80';

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Hero — cover photo with shop identity overlaid */}
      <section className="relative h-[260px] sm:h-[320px] overflow-hidden">
        <Image
          src={heroSrc}
          alt={s.publicName}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Back button — floating glass pill */}
        <Link
          href="/"
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/25 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2.5} /> Back
        </Link>

        {/* Identity row — pinned to the bottom of the hero */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-lg flex-shrink-0 relative">
              {s.logoUrl ? (
                <Image src={s.logoUrl} alt={s.publicName} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-700 text-2xl font-extrabold bg-primary-50">
                  {s.publicName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                {s.publicName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/90">
                {s.category && (
                  <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm font-semibold">
                    {s.category}
                  </span>
                )}
                {s.floorName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" strokeWidth={2.5} /> {s.floorName}{s.unitCode ? ` · ${s.unitCode}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description + quick-contact row */}
      {(s.description || s.phone || s.whatsapp) && (
        <section className="bg-white border-b border-ink-100">
          <div className="max-w-5xl mx-auto px-5 py-5">
            {s.description && (
              <p className="text-sm text-ink-600 leading-relaxed mb-3">{s.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-100 text-ink-700 font-semibold hover:bg-ink-200 transition-colors">
                  <Phone className="w-3 h-3" strokeWidth={2.5} /> {s.phone}
                </a>
              )}
              {s.whatsapp && (
                <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 text-success-700 font-semibold hover:bg-success-100 transition-colors">
                  <MessageCircle className="w-3 h-3" strokeWidth={2.5} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Search + product grid */}
      <section className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in this shop"
              className="input-base pl-9 text-sm"
            />
          </div>
          <p className="text-xs text-ink-500 tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {productsQ.isLoading ? (
          <div className="text-center text-sm text-ink-500 py-12">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="w-7 h-7 mx-auto text-ink-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-ink-700 mb-1">
              {query ? 'No matches' : 'No products yet'}
            </p>
            <p className="text-xs text-ink-500">
              {query ? 'Try a different search term.' : 'This shop hasn’t published any items.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} shopId={shopId} product={p} />
            ))}
          </div>
        )}
      </section>
      <AskYoGuideTrigger />
    </div>
  );
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  priceAmount: string | null;
  currency: string | null;
  stockCount: number;
  imageUrl: string | null;
  isBuyAndTryEligible: boolean;
};

function ProductCard({ shopId, product }: { shopId: string; product: Product }) {
  const outOfStock = product.stockCount <= 0;
  return (
    <article className="bg-white rounded-2xl border border-ink-100 overflow-hidden flex flex-col">
      <div className="aspect-square bg-ink-100 relative">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-7 h-7 text-ink-300" strokeWidth={1.5} />
          </div>
        )}
        {product.isBuyAndTryEligible && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-600 text-white">
            Buy &amp; Try
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-ink-900 line-clamp-2">{product.name}</h3>
        {product.category && <p className="text-[11px] text-ink-500 mt-0.5">{product.category}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <p className="text-sm font-bold tabular-nums text-ink-900">
            {product.priceAmount
              ? `${Number(product.priceAmount).toLocaleString('en-RW')} ${product.currency ?? 'RWF'}`
              : '—'}
          </p>
          {outOfStock || !product.isBuyAndTryEligible ? (
            <button
              disabled
              className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-200 text-ink-400 cursor-not-allowed"
            >
              <ShoppingBag className="w-3 h-3" strokeWidth={2.5} />
              {outOfStock ? 'Out' : 'N/A'}
            </button>
          ) : (
            <Link
              href={`/shop/${shopId}/checkout/${product.id}`}
              className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <ShoppingBag className="w-3 h-3" strokeWidth={2.5} />
              Buy &amp; Try
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
