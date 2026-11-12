import { routing } from '@/i18n/routing';
import { absoluteUrl } from './site';

/**
 * Canonical + hreflang alternates for a route. Every indexable page MUST pass
 * its own result: a page-level `alternates` replaces the layout's entirely.
 *
 * - `canonical` points at this locale's own URL.
 * - `languages` lists pl / en plus `x-default` (the Polish default).
 */
export function getAlternates(
  href: string,
  locale: string = routing.defaultLocale,
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, absoluteUrl(l, href)]),
  );
  languages['x-default'] = absoluteUrl(routing.defaultLocale, href);
  return { canonical: absoluteUrl(locale, href), languages };
}
