import Link from 'next/link';
import Image from 'next/image';

/**
 * mallGuide brand mark — the stylized art-deco mall building. Assets live
 * in `apps/web/public/brand/`:
 *   icon-plated.png   — purple plate, white building cutout (dark backgrounds)
 *   icon-outline.png  — purple outline on transparent (light backgrounds)
 *   wordmark.png      — full horizontal lockup (unused here; rendered as text)
 *
 * When the vector export is dropped in (e.g. `wordmark.svg`, `icon.svg`),
 * swap the `src` here.
 */
interface MarkProps {
  className?: string;
  /** Use 'light' on dark backgrounds (admin sidebar, dark CTA). */
  tone?: 'primary' | 'light';
  title?: string;
  size?: number;
}

export function LogoMark({ className, tone = 'primary', title = 'mallGuide', size = 32 }: MarkProps) {
  const src = tone === 'light' ? '/brand/icon-plated.png' : '/brand/icon-outline.png';
  return (
    <Image
      src={src}
      alt={title}
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'light';
  href?: string | null;
}

const SIZE = {
  sm: { mark: 24, text: 'text-sm',  gap: 'gap-2'   },
  md: { mark: 32, text: 'text-base', gap: 'gap-2.5' },
  lg: { mark: 40, text: 'text-xl',   gap: 'gap-3'   },
} as const;

export function Logo({ className, size = 'sm', tone = 'primary', href = '/' }: LogoProps) {
  const s = SIZE[size];
  const wordmarkColor = tone === 'light' ? 'text-white' : 'text-ink-900';

  const content = (
    <span className={`inline-flex items-center ${s.gap} ${className ?? ''}`}>
      <LogoMark size={s.mark} tone={tone} title="mallGuide" />
      <span className={`font-extrabold tracking-tighter ${s.text} ${wordmarkColor}`}>
        mallGuide
      </span>
    </span>
  );

  if (!href) return content;
  return <Link href={href} className="inline-flex items-center group">{content}</Link>;
}
