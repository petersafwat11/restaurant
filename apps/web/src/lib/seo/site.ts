import { getPathname } from '@/i18n/navigation';
import { type AppLocale, routing } from '@/i18n/routing';

/** Absolute site origin (no trailing slash). Production MUST set NEXT_PUBLIC_APP_URL. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export function toLocale(value: string): AppLocale {
  return (routing.locales as readonly string[]).includes(value)
    ? (value as AppLocale)
    : routing.defaultLocale;
}

/** Locale-aware path, e.g. `/menu` (pl) or `/en/menu` (en). */
export function localePath(locale: string, href: string): string {
  return getPathname({ locale: toLocale(locale), href });
}

/** Absolute, locale-aware URL for `href`. */
export function absoluteUrl(locale: string, href: string): string {
  return `${siteUrl()}${localePath(locale, href)}`;
}

/** Absolute URL for an asset path such as `/logo.png`; passes absolute URLs through. */
export function absoluteAsset(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${siteUrl()}${pathOrUrl}`;
}
