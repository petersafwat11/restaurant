import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { MetadataRoute } from 'next';

/**
 * Per-locale sitemap with `<xhtml:link rel="alternate" hreflang>` alternates.
 * Each entry emits a row per locale and a full `alternates.languages` map so
 * Google understands the two versions are translations of each other.
 *
 * Slugs stay in English (`/menu`, `/about`) — `localePrefix: 'as-needed'`
 * keeps the Polish default unprefixed and the English variant under `/en/...`.
 *
 * The base URL falls back to localhost when `NEXT_PUBLIC_APP_URL` is unset so
 * dev builds don't crash; production deployments MUST set it.
 */
const PUBLIC_ROUTES = ['/', '/about', '/contact', '/locations', '/reservations', '/menu'] as const;

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  return PUBLIC_ROUTES.flatMap((href) => {
    const alternates = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${base}${getPathname({ locale, href })}`]),
    );
    return routing.locales.map((locale) => ({
      url: `${base}${getPathname({ locale, href })}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: href === '/' ? 1.0 : 0.7,
      alternates: { languages: alternates },
    }));
  });
}
