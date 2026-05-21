import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * Emit `<link rel="alternate" hreflang="…">` entries for every supported
 * locale at `href`. Used in per-page `generateMetadata()` so Google sees a
 * direct alternates declaration on each marketing route — the sitemap
 * carries the same data globally, but per-page metadata helps when the
 * sitemap hasn't been recrawled yet.
 */
export function getAlternates(href: string): { languages: Record<string, string> } {
  return {
    languages: Object.fromEntries(
      routing.locales.map((locale) => [locale, getPathname({ locale, href })]),
    ),
  };
}
