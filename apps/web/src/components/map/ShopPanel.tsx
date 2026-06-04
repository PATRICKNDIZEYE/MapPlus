'use client';

import Image from 'next/image';
import {
  X, Navigation, Phone, MessageCircle, Globe,
  CheckCircle2, AlertTriangle, ShoppingBag, ArrowRight,
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

export function ShopPanel({ shopId }: { shopId: string }) {
  const { selectShop, setRoute } = useMapActions();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });
  const CategoryIcon = CATEGORY_ICON[shop?.category ?? ''] ?? Store;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      <div className="absolute inset-x-0 bottom-0 h-[120%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto">

        {/* Cover photo — shown when available */}
        {shop?.coverPhotoUrl && (
          <div className="relative h-44 w-full overflow-hidden rounded-t-3xl">
            <Image
              src={shop.coverPhotoUrl}
              alt={shop.publicName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Gradient for readability of close button */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <button
              onClick={() => selectShop(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Drag handle + close (when no cover) */}
        {!shop?.coverPhotoUrl && (
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm pt-4 pb-3 px-5 flex items-center">
            <div className="w-10 h-1 bg-ink-200 rounded-full absolute left-1/2 -translate-x-1/2 top-3" />
            <div className="flex-1 mt-2" />
            <button onClick={() => selectShop(null)}
              className="w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-500 transition-colors mt-1">
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center py-12">
            <BrandedLoader size="md" label="Loading shop…" />
          </div>
        ) : shop ? (
          <div className="px-5 pb-8 pt-4">

            {/* Identity row */}
            <div className="flex items-start gap-4 mb-5">
              {/* Logo or icon */}
              <div className="w-14 h-14 rounded-2xl border border-ink-100 bg-ink-50 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs">
                {shop.logoUrl ? (
                  <Image src={shop.logoUrl} alt={shop.publicName} width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <CategoryIcon className="w-7 h-7 text-primary-600" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0 pt-1 flex-1">
                <h2 className="text-lg font-bold text-ink-900 leading-tight">{shop.publicName}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {shop.category && (
                    <span className="text-xs bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full font-medium">{shop.category}</span>
                  )}
                  <span className="text-xs text-ink-400">{shop.floorName}</span>
                  {shop.unitCode && (
                    <><span className="text-xs text-ink-200">·</span>
                    <span className="text-xs text-ink-400">{shop.unitCode}</span></>
                  )}
                </div>
              </div>
              {/* Close button when cover is shown (positioned above it) */}
              {shop.coverPhotoUrl && (
                <button onClick={() => selectShop(null)}
                  className="w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-500 transition-colors flex-shrink-0 mt-1">
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Verified */}
            {shop.verificationStatus === 'verified' && (
              <div className="flex items-center gap-1.5 text-xs text-success-700 bg-success-50 border border-success-100 px-3 py-1.5 rounded-xl w-fit mb-4">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span className="font-semibold">Verified</span>
                {shop.lastVerifiedAt && (
                  <span className="text-success-700/60">
                    · {new Date(shop.lastVerifiedAt).toLocaleDateString('en-RW', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}

            {shop.description && (
              <p className="text-sm text-ink-500 leading-relaxed mb-5">{shop.description}</p>
            )}

            {/* Primary CTA — Visit storefront */}
            <a
              href={`/shop/${shop.id}`}
              className="group flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all shadow-sm shadow-primary-200"
            >
              <span className="inline-flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-sm font-bold">Visit storefront</span>
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </a>

            {/* Secondary actions */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <ActionBtn icon={Navigation}     label="Directions" onClick={() => setRoute(shopId)} primary />
              {shop.phone    && <ActionBtn icon={Phone}          label="Call"      onClick={() => window.open(`tel:${shop.phone}`)} />}
              {shop.whatsapp && <ActionBtn icon={MessageCircle}  label="WhatsApp"  onClick={() => window.open(`https://wa.me/${shop.whatsapp?.replace(/\D/g, '')}`)} />}
            </div>

            {/* Contact */}
            {(shop.phone || shop.email || shop.website) && (
              <div className="border-t border-ink-50 pt-4 mb-4 space-y-2">
                <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-2">Contact</p>
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className="flex items-center gap-2.5 text-sm text-ink-700 hover:text-primary-600 group">
                    <Phone className="w-4 h-4 text-ink-300 group-hover:text-primary-500" strokeWidth={2} />
                    {shop.phone}
                  </a>
                )}
                {shop.website && (
                  <a href={shop.website} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-sm text-ink-700 hover:text-primary-600 group">
                    <Globe className="w-4 h-4 text-ink-300 group-hover:text-primary-500" strokeWidth={2} />
                    {shop.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}

            {/* Products */}
            {shop.products && shop.products.length > 0 && (
              <div className="border-t border-ink-50 pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">Products &amp; Services</p>
                  <a
                    href={`/shop/${shop.id}`}
                    className="text-[10px] font-semibold text-primary-600 hover:text-primary-700"
                  >
                    View all →
                  </a>
                </div>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 snap-x snap-mandatory scroll-smooth">
                  {shop.products.slice(0, 8).map((p) => (
                    <a
                      key={p.id}
                      href={`/shop/${shop.id}`}
                      className="flex-shrink-0 w-[124px] snap-start group"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-ink-100 bg-ink-100">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="124px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Store className="w-6 h-6 text-ink-300" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-ink-900 mt-1.5 line-clamp-1">{p.name}</p>
                      {p.priceAmount && (
                        <p className="text-[11px] font-bold text-primary-700 tabular-nums">
                          {Number(p.priceAmount).toLocaleString('en-RW')} {p.currency ?? 'RWF'}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            <div className="border-t border-ink-50 pt-4">
              <button className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                Report wrong info
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Store className="w-10 h-10 text-ink-200 mx-auto mb-2" />
            <p className="text-sm text-ink-400">Shop not found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, primary = false,
}: { icon: React.ElementType; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition-all
        ${primary
          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200'
          : 'bg-ink-50 hover:bg-ink-100 text-ink-600 border border-ink-100'}`}>
      <Icon className="w-5 h-5" strokeWidth={primary ? 2.5 : 2} />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
