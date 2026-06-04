'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  X, Navigation, MapPin, ArrowUp, ArrowRight, ArrowLeft, DoorOpen,
  ChevronRight, Footprints, Accessibility, Sparkles,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMapActions } from '@/store/map.store';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

interface Props {
  shopId: string;
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
 * Front-end-only turn-by-turn simulation.
 *
 * We don't run an A* over the nav graph yet — instead we generate a
 * plausible 3-5 step walk to the shop based on its floor + unit code.
 * The phrasing mimics how a Kigali shopper would describe the walk
 * (entrance → atrium → escalator → corridor → arrival).
 *
 * When a real routing pass lands (backend already has trpc.routing.route),
 * swap the `simulateSteps` call for an actual `trpc.routing.route.useQuery`.
 */
export function DirectionsPanel({ shopId }: Props) {
  const { clearRoute, selectShop } = useMapActions();
  const { data: shop, isLoading } = trpc.shops.byId.useQuery({ id: shopId });

  // Step animation: reveal one step at a time during "navigation".
  const [activeStep, setActiveStep] = useState(0);
  const [accessibleMode, setAccessibleMode] = useState(false);

  const steps = useMemo<Step[]>(() => {
    if (!shop) return [];
    return simulateSteps(shop, accessibleMode);
  }, [shop, accessibleMode]);

  const totalDistance = steps.reduce((s, x) => s + x.distanceM, 0);
  const etaSeconds    = Math.round(totalDistance / 1.2);   // ~1.2 m/s walking
  const etaMinutes    = Math.ceil(etaSeconds / 60);

  // Auto-advance the active step every 4s to feel like real-time navigation.
  useEffect(() => {
    if (!steps.length) return;
    const t = setInterval(() => {
      setActiveStep((i) => (i + 1 >= steps.length ? 0 : i + 1));
    }, 4000);
    return () => clearInterval(t);
  }, [steps.length]);

  function close() {
    clearRoute();
  }

  function arrived() {
    clearRoute();
    // Keep the shop selected so user sees the panel after "arriving".
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 max-h-[80vh] flex flex-col bg-white rounded-t-3xl shadow-2xl border-t border-ink-100">
      {/* Drag handle */}
      <div className="pt-3 pb-1 flex items-center justify-center">
        <span className="w-10 h-1 rounded-full bg-ink-200" />
      </div>

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Navigation className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Guide Me There</p>
            <p className="text-sm font-bold text-ink-900 truncate">
              {isLoading ? '…' : shop?.publicName ?? 'Loading'}
            </p>
          </div>
        </div>
        <button onClick={close}
          className="w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-500 flex-shrink-0">
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* ETA banner */}
      <div className="mx-5 mb-3 px-4 py-3 rounded-2xl bg-primary-50 border border-primary-100 flex items-center gap-4 flex-shrink-0">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-700">ETA</p>
          <p className="text-2xl font-extrabold tracking-tight text-primary-900 tabular-nums">
            {etaMinutes} <span className="text-xs font-semibold opacity-70">min</span>
          </p>
        </div>
        <div className="h-10 w-px bg-primary-200" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-700">Distance</p>
          <p className="text-sm font-bold text-primary-900 tabular-nums">{totalDistance} m</p>
          {shop?.floorName && <p className="text-[11px] text-primary-700/80 mt-0.5">via {shop.floorName} · Unit {shop.unitCode}</p>}
        </div>
        <button
          onClick={() => setAccessibleMode((v) => !v)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
            ${accessibleMode ? 'bg-primary-600 text-white' : 'bg-white text-primary-700 border border-primary-200 hover:border-primary-400'}`}
          title="Accessibility mode — avoid stairs"
          aria-label="Accessibility mode"
        >
          <Accessibility className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-5 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <BrandedLoader size="md" label="Plotting your route…" />
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, i) => {
              const Icon = ICON_BY_KEY[step.icon];
              const isActive = i === activeStep;
              const isPast = i < activeStep;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-3 px-3 py-3 rounded-2xl border transition-all
                    ${isActive ? 'bg-primary-50 border-primary-200 shadow-sm'
                     : isPast  ? 'bg-ink-50 border-ink-100 opacity-60'
                               : 'bg-white border-ink-100'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500'
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm leading-snug ${isActive ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                      {step.text}
                    </p>
                    <p className="text-[11px] text-ink-400 mt-0.5 inline-flex items-center gap-1">
                      <Footprints className="w-3 h-3" strokeWidth={2.5} />
                      {step.distanceM} m
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-primary-500 mt-2 flex-shrink-0 animate-pulse" strokeWidth={2.5} />}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-ink-100 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={arrived}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-3 rounded-full transition-colors"
        >
          <Sparkles className="w-4 h-4" strokeWidth={2.5} />
          I&apos;ve arrived
        </button>
      </div>
    </div>
  );
}

/**
 * Generate plausible walking steps to a shop. Phrasing uses landmarks
 * Kigali shoppers actually recognize ("the central atrium", "main
 * escalator"). Distances are reasonable for a 240m × 130m mall.
 *
 * Algorithm is deterministic from shop data so the same shop always
 * produces the same route.
 */
function simulateSteps(
  shop: { publicName: string; floorName?: string | null; floorNumber?: number | null; unitCode?: string | null; category?: string | null },
  accessible: boolean,
): Step[] {
  const floorNum = shop.floorNumber ?? 0;
  const unitCode = shop.unitCode ?? '';
  const unitLetter = unitCode.match(/[A-Z]/)?.[0] ?? 'A';

  // Side of the building inferred from unit letter (A on left, F on right etc.)
  const sideTurnAfterAtrium: 'right' | 'left' =
    ['A', 'B', 'C'].includes(unitLetter) ? 'left' : 'right';

  // Distance roughly proportional to letter position
  const idx = unitLetter.charCodeAt(0) - 'A'.charCodeAt(0);
  const corridorWalk = 20 + idx * 8;

  const steps: Step[] = [];

  steps.push({
    icon: 'door',
    text: 'Start at the main entrance, head straight past the welcome desk.',
    distanceM: 12,
  });

  steps.push({
    icon: 'straight',
    text: 'Walk through the central atrium — the open court with the fountain.',
    distanceM: 35,
  });

  if (floorNum > 0) {
    const verticalLandmark = accessible ? 'elevator (north side)' : 'central escalator';
    const goingUp = floorNum > 0;
    steps.push({
      icon: 'up',
      text: `${goingUp ? 'Take' : 'Descend'} the ${verticalLandmark} to ${shop.floorName ?? `Level ${floorNum}`}.`,
      distanceM: 8 + Math.abs(floorNum) * 4,
    });
  }

  steps.push({
    icon: sideTurnAfterAtrium,
    text: `Turn ${sideTurnAfterAtrium} into Corridor ${unitLetter}.`,
    distanceM: 6,
  });

  steps.push({
    icon: 'straight',
    text: `Walk straight past ${idx + 1} shop${idx === 0 ? '' : 's'} — ${shop.publicName} is on your ${sideTurnAfterAtrium}.`,
    distanceM: corridorWalk,
  });

  steps.push({
    icon: 'arrive',
    text: `Arrive at ${shop.publicName} (Unit ${unitCode}).`,
    distanceM: 2,
  });

  return steps;
}
