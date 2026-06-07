'use client';

import { useMemo } from 'react';
import { X, Navigation, DoorOpen, ArrowUp, MapPin, Footprints } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMapActions, useUserAnchor } from '@/store/map.store';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

export interface MultiFloorContext {
  activeLeg:             'origin' | 'destination';
  originFloorLabel:      string;
  destFloorLabel:        string;
  onSwitchToOrigin:      () => void;
  onSwitchToDestination: () => void;
}

interface Props {
  shopId: string;
  routeCoordinates?: [number, number][];
  multiFloor?: MultiFloorContext;
}

export function DirectionsPanel({ shopId, routeCoordinates, multiFloor }: Props) {
  const { clearRoute } = useMapActions();
  const userAnchor = useUserAnchor();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });

  const distanceMetres = useMemo(() => {
    if (!routeCoordinates?.length) return 0;
    let m = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      m += planarMetres(routeCoordinates[i - 1]!, routeCoordinates[i]!);
    }
    return Math.round(m);
  }, [routeCoordinates]);

  const etaMinutes = Math.max(1, Math.ceil(distanceMetres / 1.2 / 60));

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 md:left-auto md:right-3 md:bottom-3 md:max-w-[400px]">
      <div className="bg-white shadow-2xl rounded-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-5 flex items-center justify-center">
            <BrandedLoader size="sm" label="Plotting your route…" />
          </div>
        ) : !shop ? null : (
          <>
            {/* Header */}
            <div className="px-4 pt-3 pb-2.5 flex items-center gap-3 border-b border-ink-50">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Heading to</p>
                <p className="text-sm font-bold text-ink-900 truncate leading-tight">{shop.publicName}</p>
              </div>
              {distanceMetres > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-extrabold text-primary-700 tabular-nums leading-none">
                    {etaMinutes} <span className="text-[10px] font-bold opacity-70">min</span>
                  </p>
                  <p className="text-[10px] text-ink-500 tabular-nums">~{distanceMetres} m</p>
                </div>
              )}
              <button
                onClick={() => clearRoute()}
                className="w-7 h-7 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-700 flex-shrink-0"
                aria-label="Close directions"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Origin */}
            {userAnchor && (
              <div className="px-4 py-2 bg-primary-50/40 border-b border-primary-100 flex items-center gap-2">
                <DoorOpen className="w-3 h-3 text-primary-600 flex-shrink-0" strokeWidth={2.5} />
                <p className="text-[11px] text-primary-800">
                  From <span className="font-bold">{userAnchor.label}</span>
                </p>
              </div>
            )}

            {/* Leg switcher — cross-floor only */}
            {multiFloor && (
              <div className="px-3 py-2 bg-ink-50/60 border-b border-ink-100 flex items-stretch gap-1.5">
                <LegPill
                  active={multiFloor.activeLeg === 'origin'}
                  badge="1"
                  primary={multiFloor.originFloorLabel}
                  secondary="Walk to escalator"
                  onClick={multiFloor.onSwitchToOrigin}
                />
                <div className="self-center flex flex-col items-center text-ink-300">
                  <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                </div>
                <LegPill
                  active={multiFloor.activeLeg === 'destination'}
                  badge="2"
                  primary={multiFloor.destFloorLabel}
                  secondary="Walk to shop"
                  onClick={multiFloor.onSwitchToDestination}
                />
              </div>
            )}

            {/* Destination */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-ink-500" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900 truncate">{shop.publicName}</p>
                <p className="text-[11px] text-ink-400 mt-0.5 truncate">
                  {shop.floorName}{shop.unitCode && ` · ${shop.unitCode}`}
                </p>
              </div>
              {distanceMetres > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-500 flex-shrink-0">
                  <Footprints className="w-3 h-3" strokeWidth={2} />
                  {distanceMetres} m
                </span>
              )}
            </div>

            {/* Route hint */}
            <div className="px-4 pb-4">
              <p className="text-[11px] text-ink-400 leading-relaxed">
                Follow the line on the map to reach {shop.publicName}.
                {!userAnchor && ' Scan a QR code at any entrance to set your starting point.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LegPill({
  active, badge, primary, secondary, onClick,
}: {
  active: boolean; badge: string; primary: string; secondary: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left
        ${active
          ? 'bg-primary-600 border-primary-700 text-white shadow-sm'
          : 'bg-white border-ink-200 text-ink-700 hover:border-primary-300'}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0
        ${active ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}`}>
        {badge}
      </span>
      <span className="min-w-0">
        <span className={`block text-[11px] font-bold leading-tight truncate ${active ? 'text-white' : 'text-ink-900'}`}>
          {primary}
        </span>
        <span className={`block text-[9px] truncate ${active ? 'text-white/80' : 'text-ink-500'}`}>
          {secondary}
        </span>
      </span>
    </button>
  );
}

function planarMetres(a: [number, number], b: [number, number]): number {
  const midLat = (a[1] + b[1]) / 2;
  const mPerDegLng = 111_320 * Math.cos((midLat * Math.PI) / 180);
  const mPerDegLat = 110_540;
  const dx = (b[0] - a[0]) * mPerDegLng;
  const dy = (b[1] - a[1]) * mPerDegLat;
  return Math.sqrt(dx * dx + dy * dy);
}
