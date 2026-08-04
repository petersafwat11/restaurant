/**
 * Brand constants that have no DB field and are real, verified values the
 * owner provided. Keep this tiny — anything that *can* live in the DB
 * (hours, address, social links via `sameAs`) should NOT be here.
 */

/** Public Google rating (Google Maps listing). Update when it changes. */
export const GOOGLE_RATING = 4.1;

/**
 * Canonical Google Maps place link for Szef Donald (owner-provided share URL).
 * Used for "Get directions" / "Open in Maps" so they land on the real Business
 * Profile listing rather than a bare coordinate pin.
 */
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/xvbbF5kpVVKvbXW8A';
