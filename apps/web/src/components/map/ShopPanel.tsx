'use client';

import Image from 'next/image';
import {
  X, Navigation, Phone, MessageCircle, ShoppingBag, CheckCircle2,
  Laptop2, Shirt, Utensils, Pill, Banknote,
  Sparkles, Dumbbell, Clapperboard, Store,
} from 'lucide-react';
import { useMapActions } from '@/store/map.store';
import { trpc } from '@/lib/trpc';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

const CATEGORY_ICON: Record<string, React.ElementType> = {
  'Electronics':        Laptop2,
  'Fashion & Apparel':  Shirt,
  'Food & Beverages':   Utensils,
  'Health & Pharmacy':  Pill,
  'Banking & Finance':  Banknote,
  'Beauty & Cosmetics': Sparkles,
  'Sports & Fitness':   Dumbbell,
  'Entertainment':      Clapperboard,
};

/**
 * Compact bottom drawer shown when a shop is selected on the map.
 * Kept intentionally small — anything that needs more space belongs on
 * the full storefront page (/shop/[id]).
 */
export function ShopPanel({ shopId }: { shopId: string }) {
  const { selectShop, setRoute } = useMapActions();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });
  const CategoryIcon = CATEGORY_ICON[shop?.category ?? ''] ?? Store;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 md:left-auto md:right-3 md:bottom-3 md:max-w-[360px]">
      <div className="relative bg-white rounded-2xl md:rounded-2xl rounded-b-none md:rounded-b-2xl shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-6 flex items-center justify-center">
            <BrandedLoader size="sm" label="Loading shop…" />
          </div>
        ) : shop ? (
          <div className="px-4 pt-3 pb-4">

            {/* Header — logo + name + close */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl border border-ink-100 bg-ink-50 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                {shop.logoUrl ? (
                  <Image src={shop.logoUrl} alt={shop.publicName} fill className="object-cover" sizes="44px" />
                ) : (
                  <CategoryIcon className="w-5 h-5 text-primary-600" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-ink-900 leading-tight truncate">{shop.publicName}</h2>
                  {shop.verificationStatus === 'verified' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-600 flex-shrink-0" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-[11px] text-ink-500 mt-0.5 truncate">
                  {shop.category}
                  {shop.floorName && <> · {shop.floorName}</>}
                  {shop.unitCode && <> · {shop.unitCode}</>}
                </p>
              </div>
              <button
                onClick={() => selectShop(null)}
                className="w-7 h-7 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-700 flex-shrink-0 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Action row — compact, all in one line */}
            <div className="flex items-center gap-1.5 mb-3">
              <a
                href={`/shop/${shop.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-xs font-bold transition-all shadow-sm shadow-primary-200"
              >
                <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} />
                Visit store
              </a>
              <IconBtn icon={Navigation} label="Directions" onClick={() => setRoute(shopId)} />
              {shop.phone    && <IconBtn icon={Phone}         label="Call"      onClick={() => window.open(`tel:${shop.phone}`)} />}
              {shop.whatsapp && <IconBtn icon={MessageCircle} label="WhatsApp"  onClick={() => window.open(`https://wa.me/${shop.whatsapp?.replace(/\D/g, '')}`)} tone="whatsapp" />}
            </div>

            {/* Products strip — only shown when there are products */}
            {shop.products && shop.products.length > 0 && (
              <div className="border-t border-ink-50 pt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">Products</p>
                  <a href={`/shop/${shop.id}`} className="text-[10px] font-semibold text-primary-600 hover:text-primary-700">
                    View all →
                  </a>
                </div>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory scroll-smooth">
                  {shop.products.slice(0, 6).map((p) => (
                    <a
                      key={p.id}
                      href={`/shop/${shop.id}`}
                      className="flex-shrink-0 w-[88px] snap-start group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-ink-100 bg-ink-100">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="88px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Store className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-ink-900 mt-1 line-clamp-1 leading-tight">{p.name}</p>
                      {p.priceAmount && (
                        <p className="text-[10px] font-bold text-primary-700 tabular-nums leading-tight">
                          {Number(p.priceAmount).toLocaleString('en-RW')} {p.currency ?? 'RWF'}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-6 text-center">
            <Store className="w-7 h-7 text-ink-200 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-ink-400">Shop not found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon, label, onClick, tone = 'default',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'whatsapp';
}) {
  const cls = tone === 'whatsapp'
    ? 'bg-success-50 hover:bg-success-100 text-success-700 border-success-100'
    : 'bg-ink-50 hover:bg-ink-100 text-ink-700 border-ink-100';
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors flex-shrink-0 ${cls}`}
    >
      <Icon className="w-4 h-4" strokeWidth={2.25} />
    </button>
  );
}
