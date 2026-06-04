'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  X, Navigation, MapPin, ArrowUp, ArrowRight, ArrowLeft, DoorOpen,
  ChevronRight, Footprints, Accessibility, Sparkles, ChevronUp, ChevronDown,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMapActions, useUserAnchor } from '@/store/map.store';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

interface Props {
  shopId: string;
  /** Polyline used to draw the route on the map. We re-use it to compute real distance. */
  routeCoordinates?: [number, number][];
}

type StepIcon = 'door' | 'straight' | 'right' | 'left' | 'up' | 'arrive';

interface Step {
  icon: StepIcon;
  text: string;
  /** Walking distance for this step in metres. */
  distanceM: number;
}

const ICON_BY_KEY: Record<StepIcon, React.ElementType> = {
  door:     DoorOpen,
  straight: ArrowUp,
  right:    ArrowRight,
  left:     ArrowLeft,
  up:       ArrowUp,
  arrive:   MapPin,
};

/**
 * Compact bottom drawer that activates when "Directions" is tapped from
 * a shop. Shows the user's *actual* entrance as the starting point,
 * real walking distance computed from the route polyline, and a peek
 * of the next step. Tap the chevron to expand the full step list.
 */
export function DirectionsPanel({ shopId, routeCoordinates }: Props) {
  const { clearRoute } = useMapActions();
  const userAnchor = useUserAnchor();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });

  const [activeStep, setActiveStep] = useState(0);
  const [expanded, setExpanded]     = useState(false);
  const [accessibleMode, setAccessibleMode] = useState(false);

  // Real walking distance from the polyline we drew on the map.
  // Falls back to a sensible estimate when no route yet (loading).
  const totalDistance = useMemo(() => {
    if (!routeCoordinates?.length) return 0;
    let m = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      m += planarMetres(routeCoordinates[i - 1]!, routeCoordinates[i]!);
    }
    return Math.round(m);
  }, [routeCoordinates]);

  const steps = useMemo<Step[]>(() => {
    if (!shop) return [];
    return simulateSteps(shop, accessibleMode, userAnchor?.label, totalDistance);
  }, [shop, accessibleMode, userAnchor?.label, totalDistance]);

  const etaMinutes = Math.max(1, Math.ceil(totalDistance / 1.2 / 60));

  // Auto-advance to feel like live navigation; pauses when expanded so
  // the user can read at their own pace.
  useEffect(() => {
    if (!steps.length || expanded) return;
    const t = setInterval(() => {
      setActiveStep((i) => (i + 1 >= steps.length ? i : i + 1));
    }, 3500);
    return () => clearInterval(t);
  }, [steps.length, expanded]);

  const current = steps[activeStep];
  const next    = steps[activeStep + 1];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 md:left-auto md:right-3 md:bottom-3 md:max-w-[380px]">
      <div className="relative bg-white shadow-2xl rounded-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-5 flex items-center justify-center">
            <BrandedLoader size="sm" label="Plotting your route…" />
          </div>
        ) : !shop ? null : (
          <>
            {/* Header — shop name + ETA + close, all in one row */}
            <div className="px-4 pt-3 pb-2.5 flex items-center gap-3 border-b border-ink-50">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Heading to</p>
                <p className="text-sm font-bold text-ink-900 truncate leading-tight">{shop.publicName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-extrabold text-primary-700 tabular-nums leading-none">
                  {etaMinutes} <span className="text-[10px] font-bold opacity-70">min</span>
                </p>
                <p className="text-[10px] text-ink-500 tabular-nums">{totalDistance} m</p>
              </div>
              <button
                onClick={() => setAccessibleMode((v) => !v)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0
                  ${accessibleMode ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'}`}
                title="Avoid stairs"
                aria-label="Accessibility"
              >
                <Accessibility className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => clearRoute()}
                className="w-7 h-7 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-700 flex-shrink-0"
                aria-label="Close directions"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Origin chip — explicitly anchors the route to the user's entrance */}
            {userAnchor && (
              <div className="px-4 py-2 bg-primary-50/40 border-b border-primary-100 flex items-center gap-2">
                <DoorOpen className="w-3 h-3 text-primary-600 flex-shrink-0" strokeWidth={2.5} />
                <p className="text-[11px] text-primary-800">
                  From <span className="font-bold">{userAnchor.label}</span>
                </p>
              </div>
            )}

            {/* Current step — big, single focus */}
            {current && (
              <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                  {(() => { const Icon = ICON_BY_KEY[current.icon]; return <Icon className="w-5 h-5" strokeWidth={2.5} />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 leading-snug">{current.text}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5 inline-flex items-center gap-1">
                    <Footprints className="w-3 h-3" strokeWidth={2.5} />
                    {current.distanceM} m
                    {steps.length > 1 && (
                      <span className="ml-1.5 text-ink-400">· step {activeStep + 1} of {steps.length}</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Next step preview when collapsed */}
            {!expanded && next && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full mx-0 px-4 pb-3 flex items-center gap-2.5 text-left hover:bg-ink-50/60 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-ink-100 text-ink-500 flex items-center justify-center flex-shrink-0">
                  {(() => { const Icon = ICON_BY_KEY[next.icon]; return <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />; })()}
                </div>
                <p className="text-[12px] text-ink-600 line-clamp-1 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mr-1.5">Next</span>
                  {next.text}
                </p>
                <ChevronUp className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" strokeWidth={2.5} />
              </button>
            )}

            {/* Full step list when expanded */}
            {expanded && (
              <div className="px-4 pb-3 border-t border-ink-50">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="w-full py-2 text-[10px] font-bold uppercase tracking-wider text-ink-400 hover:text-ink-700 inline-flex items-center justify-center gap-1.5"
                >
                  Collapse <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
                </button>
                <ol className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {steps.map((step, i) => {
                    const Icon = ICON_BY_KEY[step.icon];
                    const isActive = i === activeStep;
                    const isPast   = i <  activeStep;
                    return (
                      <li
                        key={i}
                        onClick={() => setActiveStep(i)}
                        className={`flex items-start gap-2.5 px-2 py-2 rounded-xl border cursor-pointer transition-all
                          ${isActive ? 'bg-primary-50 border-primary-200'
                            : isPast ? 'bg-ink-50 border-ink-100 opacity-60'
                                     : 'bg-white border-ink-100 hover:border-ink-200'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500'
                        }`}>
                          <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-[12px] leading-snug ${isActive ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                            {step.text}
                          </p>
                          <p className="text-[10px] text-ink-400 mt-0.5 tabular-nums">{step.distanceM} m</p>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-500 mt-1 flex-shrink-0 animate-pulse" strokeWidth={2.5} />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Footer — single "I've arrived" CTA */}
            <div className="px-4 py-2.5 border-t border-ink-100 flex items-center gap-2">
              <button
                onClick={() => clearRoute()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
                I&apos;ve arrived
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Planar approximation of metres between two lng/lat points. Fine at
 * building scale where curvature is irrelevant.
 */
function planarMetres(a: [number, number], b: [number, number]): number {
  const midLat = (a[1] + b[1]) / 2;
  const mPerDegLng = 111_320 * Math.cos((midLat * Math.PI) / 180);
  const mPerDegLat = 110_540;
  const dx = (b[0] - a[0]) * mPerDegLng;
  const dy = (b[1] - a[1]) * mPerDegLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate plausible walking steps. Step 1 now uses the user's actual
 * entrance label. Total distances are scaled to match the real route
 * length so the per-step numbers add up.
 */
function simulateSteps(
  shop: { publicName: string; floorName?: string | null; floorNumber?: number | null; unitCode?: string | null; category?: string | null },
  accessible: boolean,
  entranceLabel: string | undefined,
  routeDistanceM: number,
): Step[] {
  const floorNum  = shop.floorNumber ?? 0;
  const unitCode  = shop.unitCode ?? '';
  const unitLetter = unitCode.match(/[A-Z]/)?.[0] ?? 'A';
  const sideTurn: 'right' | 'left' =
    ['A', 'B', 'C'].includes(unitLetter) ? 'left' : 'right';

  // Build the *narrative* steps first; distribute the real route
  // distance over them proportionally below.
  const narrative: Step[] = [];

  narrative.push({
    icon: 'door',
    text: `Start at ${entranceLabel ?? 'the main entrance'} and head straight inside.`,
    distanceM: 1,
  });
  narrative.push({
    icon: 'straight',
    text: 'Walk through the central atrium past the fountain.',
    distanceM: 3,
  });
  if (floorNum > 0) {
    narrative.push({
      icon: 'up',
      text: accessible
        ? `Take the elevator (north side) up to ${shop.floorName ?? `Level ${floorNum}`}.`
        : `Ride the central escalator up to ${shop.floorName ?? `Level ${floorNum}`}.`,
      distanceM: 1,
    });
  }
  narrative.push({
    icon: sideTurn,
    text: `Turn ${sideTurn} into Corridor ${unitLetter}.`,
    distanceM: 1,
  });
  narrative.push({
    icon: 'straight',
    text: `Walk down Corridor ${unitLetter} — ${shop.publicName} will be on your ${sideTurn}.`,
    distanceM: 3,
  });
  narrative.push({
    icon: 'arrive',
    text: `Arrive at ${shop.publicName}${unitCode ? ` (Unit ${unitCode})` : ''}.`,
    distanceM: 1,
  });

  // Scale narrative weights so the per-step metres sum to the real
  // route distance (or a sensible fallback when the route isn't ready).
  const fallback = 80 + (floorNum * 12);
  const target = routeDistanceM > 0 ? routeDistanceM : fallback;
  const weightSum = narrative.reduce((s, x) => s + x.distanceM, 0);
  return narrative.map((x) => ({ ...x, distanceM: Math.round((x.distanceM / weightSum) * target) }));
}
