/**
 * Brand constants that have no DB field and are real, verified values the
 * owner provided. Keep this tiny — anything that *can* live in the DB
 * (hours, address, delivery fee/minimum/radius) should NOT be here.
 */

/** Public Google rating (Google Maps listing). Update when it changes. */
export const GOOGLE_RATING = { value: 4.1, count: 235 } as const;

/**
 * Public Pyszne.pl rating (owner-verified). Shown on the home page with its
 * source; never emitted as `aggregateRating` JSON-LD for our own business
 * (Google's self-serving review policy).
 */
export const PYSZNE_RATING = {
  value: 4.6,
  countLabel: '830+',
  url: 'https://www.pyszne.pl/menu/szef-donald',
} as const;

/**
 * Canonical Google Maps place link for Szef Donald (owner-provided share URL).
 * Used for "Get directions" / "Open in Maps" so they land on the real Business
 * Profile listing rather than a bare coordinate pin.
 */
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/xvbbF5kpVVKvbXW8A';

/** Canonical public profiles — schema.org `sameAs`, footer icons, llms.txt. */
export const SAME_AS = [
  GOOGLE_MAPS_URL,
  'https://www.facebook.com/profile.php?id=100065387413019',
  'https://www.pyszne.pl/menu/szef-donald',
  'https://www.ubereats.com/pl/store/szef-donald/TgpANdXuXnaVmrxSDixbBQ',
  'https://maps.apple.com/place?place-id=IF8C1321B628BEEAB',
] as const;

/** Year the restaurant opened (owner-provided). */
export const FOUNDING_YEAR = 2019;

/** Approximate wraps sold per week in season (owner-provided). */
export const WRAPS_PER_WEEK = 1200;

/** Payment methods accepted for direct orders on szefdonald.pl. */
export const PAYMENT_METHODS = ['card', 'blik', 'cash'] as const;
