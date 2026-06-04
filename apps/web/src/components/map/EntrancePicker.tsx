'use client';

import Image from 'next/image';
import { DoorOpen, ArrowRight } from 'lucide-react';
import { useMapActions } from '@/store/map.store';
import type { Entrance } from './entrances';

interface Props {
  buildingName: string;
  entrances:    Entrance[];
  onPicked?:    () => void;
  onClose?:     () => void;
}

/**
 * Full-viewport overlay shown the first time a shopper opens the map.
 * Asks "Where did you walk in from?" so we can route directions from
 * their real position instead of an arbitrary origin.
 */
export function EntrancePicker({ buildingName, entrances, onPicked, onClose }: Props) {
  const { setUserAnchor } = useMapActions();

  if (!entrances.length) return null;

  const pick = (e: Entrance) => {
    setUserAnchor({ id: e.id, label: e.label, coordinates: e.coordinates });
    onPicked?.();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md my-4 rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* Header band */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider mb-3">
            <DoorOpen className="w-3 h-3" strokeWidth={2.5} />
            Pick your entrance
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Where did you walk in?</h2>
          <p className="text-xs text-white/85 mt-1.5 leading-relaxed">
            Pick the door you came through at <span className="font-bold">{buildingName}</span>.
            All directions to shops will start from here.
          </p>
        </div>

        {/* Choices — 2-up image grid so each one is visually obvious */}
        <div className="p-3 grid grid-cols-2 gap-2.5">
          {entrances.map((e) => (
            <button
              key={e.id}
              onClick={() => pick(e)}
              className="group text-left rounded-2xl overflow-hidden border border-ink-100 hover:border-primary-400 hover:shadow-lg transition-all"
            >
              <div className="relative aspect-[5/4] bg-ink-100 overflow-hidden">
                <Image
                  src={e.photoUrl}
                  alt={e.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 220px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                  <DoorOpen className="w-3.5 h-3.5 text-primary-700" strokeWidth={2.5} />
                </div>
                <div className="absolute bottom-2 inset-x-2">
                  <p className="text-[12px] font-bold text-white leading-tight drop-shadow-sm">{e.label}</p>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between bg-white">
                <span className="text-[10px] font-semibold text-ink-500">Ground floor</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary-600 group-hover:translate-x-0.5 transition-transform">
                  Start here <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Skip */}
        {onClose && (
          <div className="px-5 py-3 border-t border-ink-50">
            <button
              onClick={onClose}
              className="w-full text-center text-xs font-semibold text-ink-500 hover:text-ink-700 py-1.5"
            >
              Skip — I&apos;ll pick later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
