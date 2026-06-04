'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Flame, ArrowRight, Store } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const CATEGORY_COVERS: Record<string, string> = {
  'Electronics':        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
  'Fashion & Apparel':  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80',
  'Food & Beverages':   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'Health & Pharmacy':  'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&q=80',
  'Banking & Finance':  'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&q=80',
  'Beauty & Cosmetics': 'https://images.unsplash.com/photo-1522335789203-aaa05cb91a3a?w=600&q=80',
  'Sports & Fitness':   'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80',
  'Entertainment':      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
};
const GENERIC_COVER = 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=600&q=80';

/**
 * "Trending now" shops band that sits directly below the landing hero.
 * Pulls live shops from CHIC and gives every visitor an immediate, tappable
 * peek at what's actually inside.
 */
export function TrendingShopsRow() {
  const buildingQ = trpc.buildings.bySlug.useQuery({ slug: 'chic-kigali' });
  const shopsQ    = trpc.shops.listByBuilding.useQuery(
    { buildingId: buildingQ.data?.id ?? '' },
    { enabled: !!buildingQ.data?.id },
  );

  const shops = (shopsQ.data ?? []).slice(0, 8);

  return (
    <section className="bg-white border-b border-ink-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">Trending now</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
              Open inside CHIC right now.
            </h2>
          </div>
          <Link
            href="/map/chic-kigali"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 group"
          >
            See the whole mall
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Carousel */}
        {shopsQ.isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[180px] w-[200px] flex-shrink-0 rounded-2xl bg-ink-100 animate-pulse" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <p className="text-sm text-ink-500">No published shops yet.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 sm:-mx-6 sm:px-6 snap-x snap-mandatory scroll-smooth">
            {shops.map((shop) => (
              <TrendingCard key={shop.id} shop={shop} />
            ))}
            {/* "All shops" tail card */}
            <Link
              href="/map/chic-kigali"
              className="flex-shrink-0 w-[170px] sm:w-[200px] h-[180px] rounded-2xl border-2 border-dashed border-ink-200 hover:border-primary-300 bg-ink-50/60 hover:bg-primary-50/30 flex flex-col items-center justify-center gap-2 transition-all snap-start group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-primary-700" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-bold text-ink-700">See all shops</p>
              <p className="text-[10px] text-ink-500">Open the map</p>
            </Link>
          </div>
        )}

        {/* Mobile "see all" */}
        <Link
          href="/map/chic-kigali"
          className="mt-4 sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-primary-700"
        >
          See the whole mall <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

type Shop = {
  id: string;
  publicName: string;
  category: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
};

function TrendingCard({ shop }: { shop: Shop }) {
  const cover = shop.coverPhotoUrl
    ?? CATEGORY_COVERS[shop.category ?? ''] ?? GENERIC_COVER;

  return (
    <Link
      href={`/shop/${shop.id}`}
      className="flex-shrink-0 w-[170px] sm:w-[200px] group snap-start"
    >
      <div className="relative h-[180px] rounded-2xl overflow-hidden border border-ink-100 shadow-xs group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all">
        <Image
          src={cover}
          alt={shop.publicName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Logo chip top-left */}
        <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full overflow-hidden bg-white shadow-md border border-white">
          {shop.logoUrl ? (
            <Image src={shop.logoUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-50">
              <Store className="w-3.5 h-3.5 text-primary-600" strokeWidth={2.25} />
            </div>
          )}
        </div>

        {/* Name + category */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-[13px] font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
            {shop.publicName}
          </p>
          {shop.category && (
            <p className="text-[10px] text-white/80 mt-0.5 truncate">{shop.category}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
