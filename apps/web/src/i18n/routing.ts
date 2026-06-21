import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  // Always serve Polish to first-time visitors regardless of their browser's
  // Accept-Language. Without this, next-intl auto-detects the browser locale
  // and redirects English browsers to `/en`. Users can still switch to EN via
  // the language switcher; the choice persists in the NEXT_LOCALE cookie below.
  localeDetection: false,
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type AppLocale = (typeof routing.locales)[number];
