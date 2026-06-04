'use client';

import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useMapStore } from '@/store/map.store';

type TrendingShop = {
  id:            string;
  publicName:    string;
  category:      string | null;
  logoUrl:       string | null;
  coverPhotoUrl: string | null;
  unitId:        string | null;
  unitCode:      string | null;
};

// Curated fallback covers when a shop has none — pulled from Unsplash by
// category keyword. Keeps the strip visually consistent across a fresh
// database with no uploaded photos.
const CATEGORY_COVERS: Record<string, string> = {
  'Electronics':        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
  'Fashion & Apparel':  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&q=80',
  'Food & Beverages':   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'Health & Pharmacy':  'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&q=80',
  'Banking & Finance':  'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&q=80',
  'Beauty & Cosmetics': 'https://images.unsplash.com/photo-1522335789203-aaa05cb91a3a?w=400&q=80',
  'Sports & Fitness':   'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&q=80',
  'Entertainment':      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80',
};

const GENERIC_COVER = 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=400&q=80';

export function TrendingStrip({ shops }: { shops: TrendingShop[] }) {
  if (!shops.length) return null;

  // Pick the first 6 — in a future iteration "trending" can be backed by
  // visit counts. For now, the position in the directory == featured order.
  const featured = shops.slice(0, 6);

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
            <Flame className="w-3 h-3 text-amber-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-700">
            Trending now
          </h3>
        </div>
        <span className="text-[10px] text-ink-400">scroll →</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scroll-smooth">
        {featured.map((shop) => (
          <TrendingCard key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
}

function TrendingCard({ shop }: { shop: TrendingShop }) {
  const cover = shop.coverPhotoUrl
    ?? CATEGORY_COVERS[shop.category ?? ''] ?? GENERIC_COVER;

  return (
    <button
      type="button"
      onClick={() => {
        useMapStore.getState().actions.selectShop({
          shopId: shop.id, shopName: shop.publicName,
          unitId: shop.unitId ?? '', unitCode: shop.unitCode ?? '',
          category: shop.category,
        });
      }}
      className="flex-shrink-0 w-[140px] snap-start group"
    >
      <div className="relative h-[88px] rounded-xl overflow-hidden border border-ink-100 shadow-xs group-hover:shadow-card transition-shadow">
        <Image
          src={cover}
          alt={shop.publicName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="140px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {shop.logoUrl && (
          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full overflow-hidden border border-white/80 bg-white">
            <Image src={shop.logoUrl} alt="" width={24} height={24} className="object-cover w-full h-full" />
          </div>
        )}
        <div className="absolute bottom-1.5 inset-x-2">
          <p className="text-[11px] font-bold text-white leading-tight truncate">
            {shop.publicName}
          </p>
          {shop.category && (
            <p className="text-[9px] text-white/70 truncate">{shop.category}</p>
          )}
        </div>
      </div>
    </button>
  );
}
