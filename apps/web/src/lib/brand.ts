/**
 * Brand constants that have no DB field and are real, verified values the
 * owner provided. Keep this tiny — anything that *can* live in the DB
 * (hours, address, social links via `sameAs`) should NOT be here.
 */

/** Public Google rating (Google Maps listing). Update when it changes. */
export const GOOGLE_RATING = 4.1;

/**
 * Deep link to the restaurant's Google reviews. Stripped of browser-session
 * params (rlz/sei/gs_lcrp); the `#lrd=…` fragment is the stable place anchor.
 */
export const GOOGLE_REVIEWS_URL =
  'https://www.google.com/search?q=Szef+Donald+Kielce#lrd=0x47178980db5d6e31:0xaddcf6dd80bd2850,1,,,,';
