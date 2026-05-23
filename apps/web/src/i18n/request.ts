import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale } from './locale';

/**
 * next-intl request config. Reads the active locale from a `MALLGUIDE_LOCALE`
 * cookie (set by the language switcher) and loads the matching message bundle.
 * Falls back to English on any unknown value.
 *
 * Phase 1 ships the infrastructure; later phases swap in the locale-aware
 * provider once each surface starts using translated strings.
 */
export default getRequestConfig(async () => {
  // Cookies module imports kept inline so this file is safe to import from
  // both server components and pure runtime contexts without warnings.
  const { cookies } = await import('next/headers');
  const raw = cookies().get('MALLGUIDE_LOCALE')?.value;
  const locale = raw && isLocale(raw) ? raw : DEFAULT_LOCALE;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
