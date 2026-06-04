'use client';

import Image from 'next/image';
import { Sparkles, MapPin } from 'lucide-react';

// Fallback hero image — modern mall interior, used when a building has no
// cover photo of its own. Hotlinked from Unsplash (already in next.config
// remotePatterns).
const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1200&q=80';

interface MallHeroProps {
  name:         string;
  coverPhoto?:  string | null;
  description?: string | null;
  shopCount:    number;
  floorCount:   number;
}

export function MallHero({
  name, coverPhoto, description, shopCount, floorCount,
}: MallHeroProps) {
  const src = coverPhoto ?? FALLBACK_HERO;

  return (
    <div className="relative h-[156px] overflow-hidden rounded-2xl mx-3 mt-3 mb-3 shadow-card">
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        sizes="280px"
        priority
      />
      {/* Dark gradient so the text reads on any photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* "Live" pill — implies the directory is current */}
      <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
        LIVE
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3.5">
        <h2 className="text-base font-bold text-white leading-tight">
          {name}
        </h2>
        {description && (
          <p className="text-[11px] text-white/80 mt-0.5 line-clamp-1">
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2.5 text-[10px] font-semibold text-white/90">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" strokeWidth={2.5} />
            {shopCount} shops
          </span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" strokeWidth={2.5} />
            {floorCount} floor{floorCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
