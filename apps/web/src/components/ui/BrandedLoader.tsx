import { LogoMark } from '@/components/brand/Logo';

/**
 * BrandedLoader — the single, unified mallGuide loader.
 *
 * Replaces ad-hoc spinners (`Loader2`, CSS border-spinners, "Loading…" text)
 * for page/card/section loading states. NOT for tiny inline button spinners.
 *
 * Visual:
 *   - Centre: the mallGuide logo mark
 *   - Around it: two concentric indigo ripple rings
 *   - The mark itself has a subtle heartbeat pulse
 *   - Optional `label` rendered beneath, `text-sm text-ink-500`
 *   - `lg` size adds three pulsing dots beneath the label
 *   - Respects `prefers-reduced-motion` (animations drop to a static mark)
 *
 * The component does NOT impose a min-height — the parent does. Drop it inside
 * the existing `min-h-[220px] flex flex-col items-center justify-center` wrappers.
 *
 * Keyframes and helper classes live in `apps/web/src/app/globals.css`
 * (search `BrandedLoader keyframes`).
 */

type Size = 'sm' | 'md' | 'lg';
type Tone = 'default' | 'subtle';

interface BrandedLoaderProps {
  size?: Size;
  label?: string;
  tone?: Tone;
  className?: string;
}

const SIZE_PX: Record<Size, number> = { sm: 24, md: 48, lg: 80 };
// Ring is ~2.1× the mark so the ripple breathes around it without crowding.
const RING_PX: Record<Size, number> = { sm: 52, md: 104, lg: 168 };

export function BrandedLoader({
  size = 'md',
  label,
  tone = 'default',
  className,
}: BrandedLoaderProps) {
  const mark = SIZE_PX[size];
  const ring = RING_PX[size];
  const showDots = size === 'lg';
  const subtle = tone === 'subtle';

  const ringPrimary = subtle
    ? 'radial-gradient(circle, rgba(148,163,184,0.35) 0%, rgba(148,163,184,0) 65%)'
    : 'radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(124,58,237,0) 65%)';
  const ringSecondary = subtle
    ? 'radial-gradient(circle, rgba(203,213,225,0.45) 0%, rgba(203,213,225,0) 65%)'
    : 'radial-gradient(circle, rgba(167,139,250,0.42) 0%, rgba(167,139,250,0) 65%)';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`inline-flex flex-col items-center gap-2.5 ${className ?? ''}`}
    >
      <div
        className="mg-loader-wrap"
        style={{ width: ring, height: ring }}
      >
        <span
          className="mg-loader-ring"
          style={{ width: ring, height: ring, background: ringPrimary }}
        />
        <span
          className="mg-loader-ring mg-loader-ring-2"
          style={{ width: ring, height: ring, background: ringSecondary }}
        />
        <span className="mg-loader-mark">
          <LogoMark
            size={mark}
            tone="primary"
            title="mallGuide"
            className={subtle ? 'opacity-60' : ''}
          />
        </span>
      </div>

      {label && (
        <p className={`text-sm text-center ${subtle ? 'text-ink-400' : 'text-ink-500'}`}>
          {label}
        </p>
      )}

      {showDots && (
        <div className="flex items-center gap-1.5 mt-0.5" aria-hidden="true">
          <span className={`mg-loader-dot ${subtle ? 'bg-ink-300' : 'bg-primary-500'}`} />
          <span className={`mg-loader-dot mg-loader-dot-2 ${subtle ? 'bg-ink-300' : 'bg-primary-500'}`} />
          <span className={`mg-loader-dot mg-loader-dot-3 ${subtle ? 'bg-ink-300' : 'bg-primary-500'}`} />
        </div>
      )}

      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  );
}
