'use client';

type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';

const VARIANTS: Record<BadgeVariant, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  red:    'bg-red-50 text-red-700 border-red-100',
  gray:   'bg-gray-50 text-gray-600 border-gray-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
};

export function Badge({
  children,
  variant = 'gray',
  dot = false,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${VARIANTS[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${
        variant === 'green' ? 'bg-emerald-500' :
        variant === 'blue'  ? 'bg-blue-500' :
        variant === 'amber' ? 'bg-amber-500' :
        variant === 'red'   ? 'bg-red-500' :
        variant === 'purple'? 'bg-violet-500' :
        'bg-gray-400'
      }`} />}
      {children}
    </span>
  );
}
