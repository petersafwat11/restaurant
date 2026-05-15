/**
 * Deep-link builders for the mobile app. The scheme is configurable via
 * `APP_DEEP_LINK_SCHEME` (defaults to `restaurant`) so push payloads and the
 * Expo router stay in sync. Pure string builders — no runtime deps.
 */

export const DEFAULT_DEEP_LINK_SCHEME = 'restaurant';

function normalizeScheme(scheme?: string): string {
  const s = (scheme ?? DEFAULT_DEEP_LINK_SCHEME).trim().replace(/:\/\/.*$/, '');
  return s.length > 0 ? s : DEFAULT_DEEP_LINK_SCHEME;
}

export function deepLink(path: string, scheme?: string): string {
  const s = normalizeScheme(scheme);
  const cleanPath = path.replace(/^\/+/, '');
  return `${s}://${cleanPath}`;
}

export function orderDeepLink(orderId: string, scheme?: string): string {
  return deepLink(`orders/${encodeURIComponent(orderId)}`, scheme);
}

export function notificationsDeepLink(scheme?: string): string {
  return deepLink('notifications', scheme);
}

export function reservationDeepLink(reservationId: string, scheme?: string): string {
  return deepLink(`reservations/${encodeURIComponent(reservationId)}`, scheme);
}
