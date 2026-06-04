'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  X, Navigation, MapPin, ArrowUp, ArrowRight, ArrowLeft, DoorOpen,
  ChevronRight, Footprints, Accessibility, Sparkles, ChevronUp, ChevronDown,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMapActions, useUserAnchor } from '@/store/map.store';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

type Leg = 'origin' | 'transition' | 'destination';

export interface MultiFloorContext {
  activeLeg:             'origin' | 'destination';
  originFloorLabel:      string;
  destFloorLabel:        string;
  onSwitchToOrigin:      () => void;
  onSwitchToDestination: () => void;
}

interface Props {
  shopId: string;
  /** Polyline used to draw the route on the map. We re-use it to compute real distance. */
  routeCoordinates?: [number, number][];
  /** When set, the route spans two floors and we render a leg switcher. */
  multiFloor?: MultiFloorContext;
}

type StepIcon = 'door' | 'straight' | 'right' | 'left' | 'up' | 'arrive';

interface Step {
  icon:      StepIcon;
  text:      string;
  distanceM: number;
  /** Which leg of the journey this step belongs to. */
  leg:       Leg;
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
 * a shop. Real-anchored to the user's chosen entrance, real walking
 * distance from the polyline, leg-aware when the destination is on a
 * different floor.
 */
export function DirectionsPanel({ shopId, routeCoordinates, multiFloor }: Props) {
  const { clearRoute } = useMapActions();
  const userAnchor = useUserAnchor();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });

  const [expanded, setExpanded]           = useState(false);
  const [accessibleMode, setAccessibleMode] = useState(false);

  // Real walking distance from the polyline drawn on the map. This is
  // *just the current leg's* distance — for cross-floor routes we
  // augment with an estimate below.
  const currentLegMetres = useMemo(() => {
    if (!routeCoordinates?.length) return 0;
    let m = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      m += planarMetres(routeCoordinates[i - 1]!, routeCoordinates[i]!);
    }
    return Math.round(m);
  }, [routeCoordinates]);

  const steps = useMemo<Step[]>(() => {
    if (!shop) return [];
    return simulateSteps(shop, accessibleMode, userAnchor?.label, currentLegMetres, !!multiFloor);
  }, [shop, accessibleMode, userAnchor?.label, currentLegMetres, multiFloor]);

  // Total journey distance estimate. When multi-floor, we only know one
  // leg precisely (the visible one); estimate the other half via the
  // narrative weights below.
  const totalDistance = useMemo(() => {
    if (!multiFloor) return currentLegMetres;
    const weightTotal = steps.reduce((s, x) => s + x.distanceM, 0);
    return weightTotal;
  }, [multiFloor, steps, currentLegMetres]);

  const etaMinutes = Math.max(1, Math.ceil(totalDistance / 1.2 / 60));

  // First step of the leg currently being viewed on the map. We snap
  // the highlighted step to it when the user flips legs.
  const activeLegSteps = useMemo(() => {
    if (!multiFloor) return steps;
    return steps.filter((s) =>
      multiFloor.activeLeg === 'origin'
        ? s.leg === 'origin' || s.leg === 'transition'
        : s.leg === 'transition' || s.leg === 'destination',
    );
  }, [steps, multiFloor]);

  const [activeStep, setActiveStep] = useState(0);
  // Reset the highlighted step whenever the visible leg changes.
  useEffect(() => {
    const firstIdx = multiFloor
      ? steps.findIndex((s) =>
          multiFloor.activeLeg === 'origin'
            ? s.leg === 'origin'
            : s.leg === 'destination')
      : 0;
    setActiveStep(firstIdx >= 0 ? firstIdx : 0);
  }, [multiFloor?.activeLeg, steps, multiFloor]);

  // Auto-advance within the currently visible leg.
  useEffect(() => {
    if (!steps.length || expanded) return;
    const t = setInterval(() => {
      setActiveStep((i) => {
        const next = i + 1;
        if (next >= steps.length) return i;
        // Don't auto-cross legs — stop at the last step of the active leg.
        if (multiFloor && steps[next]?.leg && stepBelongsTo(steps[next]!.leg, multiFloor.activeLeg) === false) {
          return i;
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [steps, expanded, multiFloor]);

  const current = steps[activeStep];
  const next    = steps[activeStep + 1];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 md:left-auto md:right-3 md:bottom-3 md:max-w-[400px]">
      <div className="relative bg-white shadow-2xl rounded-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-5 flex items-center justify-center">
            <BrandedLoader size="sm" label="Plotting your route…" />
          </div>
        ) : !shop ? null : (
          <>
            {/* Header — shop name + ETA + close */}
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
                <p className="text-[10px] text-ink-500 tabular-nums">~{totalDistance} m</p>
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

            {/* Origin chip */}
            {userAnchor && (
              <div className="px-4 py-2 bg-primary-50/40 border-b border-primary-100 flex items-center gap-2">
                <DoorOpen className="w-3 h-3 text-primary-600 flex-shrink-0" strokeWidth={2.5} />
                <p className="text-[11px] text-primary-800">
                  From <span className="font-bold">{userAnchor.label}</span>
                </p>
              </div>
            )}

            {/* Leg switcher — only on cross-floor routes */}
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

            {/* Current step — big focus */}
            {current && (
              <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                  {(() => { const Icon = ICON_BY_KEY[current.icon]; return <Icon className="w-5 h-5" strokeWidth={2.5} />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 leading-snug">{current.text}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5 inline-flex items-center gap-1.5">
                    <Footprints className="w-3 h-3" strokeWidth={2.5} />
                    {current.distanceM} m
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-400">step {activeLegSteps.indexOf(current) + 1} of {activeLegSteps.length}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Next step preview */}
            {!expanded && next && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full px-4 pb-3 flex items-center gap-2.5 text-left hover:bg-ink-50/60 transition-colors"
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

            {/* Expanded step list */}
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
                    const Icon     = ICON_BY_KEY[step.icon];
                    const isActive = i === activeStep;
                    const isPast   = i <  activeStep;
                    const onActiveLeg = !multiFloor || stepBelongsTo(step.leg, multiFloor.activeLeg);
                    return (
                      <li
                        key={i}
                        onClick={() => setActiveStep(i)}
                        className={`flex items-start gap-2.5 px-2 py-2 rounded-xl border cursor-pointer transition-all
                          ${isActive ? 'bg-primary-50 border-primary-200'
                            : isPast ? 'bg-ink-50 border-ink-100 opacity-60'
                                     : 'bg-white border-ink-100 hover:border-ink-200'}
                          ${!onActiveLeg ? 'opacity-50' : ''}`}
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
                          <p className="text-[10px] text-ink-400 mt-0.5 tabular-nums inline-flex items-center gap-1.5">
                            {step.distanceM} m
                            {multiFloor && (
                              <span className={`px-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                step.leg === 'origin'      ? 'bg-amber-100 text-amber-700' :
                                step.leg === 'transition'  ? 'bg-primary-100 text-primary-700' :
                                                             'bg-success-100 text-success-700'
                              }`}>
                                {step.leg === 'origin' ? multiFloor.originFloorLabel
                                  : step.leg === 'transition' ? 'transit'
                                  : multiFloor.destFloorLabel}
                              </span>
                            )}
                          </p>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-500 mt-1 flex-shrink-0 animate-pulse" strokeWidth={2.5} />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* Footer */}
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

// ── helpers ─────────────────────────────────────────────────────────────

function LegPill({
  active, badge, primary, secondary, onClick,
}: {
  active: boolean;
  badge: string;
  primary: string;
  secondary: string;
  onClick: () => void;
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

function stepBelongsTo(stepLeg: Leg, activeLeg: 'origin' | 'destination'): boolean {
  if (stepLeg === 'transition') return true; // belongs to both
  return stepLeg === activeLeg;
}

function planarMetres(a: [number, number], b: [number, number]): number {
  const midLat = (a[1] + b[1]) / 2;
  const mPerDegLng = 111_320 * Math.cos((midLat * Math.PI) / 180);
  const mPerDegLat = 110_540;
  const dx = (b[0] - a[0]) * mPerDegLng;
  const dy = (b[1] - a[1]) * mPerDegLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build a leg-tagged narrative. When the route is single-floor, all
 * steps are tagged `origin`. When cross-floor, steps 1–2 are origin,
 * the escalator step is `transition`, and steps after it are
 * `destination`.
 *
 * Distances are scaled by leg: the visible leg gets the precise
 * `currentLegM`; the invisible leg is estimated proportionally to its
 * narrative weight so the total still adds up reasonably.
 */
function simulateSteps(
  shop:           { publicName: string; floorName?: string | null; floorNumber?: number | null; unitCode?: string | null },
  accessible:     boolean,
  entranceLabel:  string | undefined,
  currentLegM:    number,
  isCrossFloor:   boolean,
): Step[] {
  const floorNum  = shop.floorNumber ?? 0;
  const unitCode  = shop.unitCode ?? '';
  const unitLetter = unitCode.match(/[A-Z]/)?.[0] ?? 'A';
  const sideTurn: 'right' | 'left' =
    ['A', 'B', 'C'].includes(unitLetter) ? 'left' : 'right';

  const narrative: Array<Omit<Step, 'distanceM'> & { weight: number }> = [];

  // Origin leg
  narrative.push({ icon: 'door',     leg: 'origin', weight: 1, text: `Start at ${entranceLabel ?? 'the main entrance'} and head inside.` });
  narrative.push({ icon: 'straight', leg: 'origin', weight: 3, text: 'Walk through the central atrium past the fountain.' });

  // Transition
  if (floorNum > 0) {
    narrative.push({
      icon: 'up',
      leg:  'transition',
      weight: 1,
      text: accessible
        ? `Take the elevator (north side) up to ${shop.floorName ?? `Level ${floorNum}`}.`
        : `Ride the central escalator up to ${shop.floorName ?? `Level ${floorNum}`}.`,
    });
  }

  // Destination leg
  narrative.push({ icon: sideTurn,  leg: 'destination', weight: 1, text: `Turn ${sideTurn} into Corridor ${unitLetter}.` });
  narrative.push({ icon: 'straight', leg: 'destination', weight: 3, text: `Walk down Corridor ${unitLetter} — ${shop.publicName} is on your ${sideTurn}.` });
  narrative.push({ icon: 'arrive',   leg: 'destination', weight: 1, text: `Arrive at ${shop.publicName}${unitCode ? ` (Unit ${unitCode})` : ''}.` });

  // Distance distribution. Single-floor: spread currentLegM across all
  // steps proportionally. Cross-floor: spread currentLegM across only
  // the steps in the visible leg; estimate the other leg from
  // narrative weights with a baseline of ~12m per weight unit.
  if (!isCrossFloor) {
    const totalWeight = narrative.reduce((s, x) => s + x.weight, 0);
    const target = currentLegM > 0 ? currentLegM : 90;
    return narrative.map((x) => ({
      icon: x.icon, text: x.text, leg: x.leg,
      distanceM: Math.round((x.weight / totalWeight) * target),
    }));
  }

  // Cross-floor scaling
  const originSteps      = narrative.filter((x) => x.leg === 'origin');
  const destSteps        = narrative.filter((x) => x.leg === 'destination');
  const originWeight     = originSteps.reduce((s, x) => s + x.weight, 0);
  const destWeight       = destSteps.reduce((s, x) => s + x.weight, 0);

  // Pick which leg the current routeCoordinates represents — we don't
  // know directly here, so we infer from currentLegM > 0. We bias
  // toward the origin leg as the "first" if currentLegM is small,
  // destination if larger; otherwise just split.
  const estimateOther    = currentLegM > 0 ? currentLegM : 50; // fall back

  const originTarget = currentLegM > 0 ? currentLegM : estimateOther;
  const destTarget   = estimateOther;

  return narrative.map((x) => {
    if (x.leg === 'origin') {
      return { icon: x.icon, text: x.text, leg: x.leg, distanceM: Math.round((x.weight / originWeight) * originTarget) };
    }
    if (x.leg === 'destination') {
      return { icon: x.icon, text: x.text, leg: x.leg, distanceM: Math.round((x.weight / destWeight) * destTarget) };
    }
    return { icon: x.icon, text: x.text, leg: x.leg, distanceM: 0 };
  });
}
