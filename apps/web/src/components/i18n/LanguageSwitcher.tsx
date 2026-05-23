'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/locale';

/**
 * Writes the active locale to a cookie and refreshes the route so the
 * server layout reloads the matching message bundle.
 */
export function LanguageSwitcher() {
  const current = useLocale() as Locale;
  const router = useRouter();

  function select(next: Locale) {
    if (next === current) return;
    document.cookie = `MALLGUIDE_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
      <Globe className="w-3.5 h-3.5" strokeWidth={2} />
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => select(e.target.value as Locale)}
        className="bg-transparent border-0 text-ink-700 focus:outline-none cursor-pointer"
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>{LOCALE_LABELS[loc]}</option>
        ))}
      </select>
    </label>
  );
}
