import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  // Always serve Polish to first-time visitors regardless of their browser's
  // Accept-Language. Without this, next-intl auto-detects the browser locale
  // and redirects English browsers to `/en`. Users switch to EN via the
  // language switcher, and the locale lives in the URL (`/en/...`).
  localeDetection: false,
  // With detection off the NEXT_LOCALE cookie is never read, but the proxy
  // would still Set-Cookie it on a visitor's first response — and a cookie
  // modified during load makes the page ineligible for the back/forward cache.
  localeCookie: false,
});

export type AppLocale = (typeof routing.locales)[number];
