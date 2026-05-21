/**
 * Cart session key — cookie-backed, server-readable.
 *
 * Replaces the previous localStorage-only approach so the cart count can SSR
 * cleanly without a hydration flicker.
 *
 * Lifecycle:
 *  - Server components read the cookie via `getCartSessionKey()` (returns null
 *    if guest hasn't visited yet).
 *  - First page paint with no cookie: the client `<CartSessionProvider>`
 *    POSTs to `/api/cart-session` to mint one; subsequent requests see it.
 *  - On successful login, `clearCartSession()` deletes the cookie (the
 *    merge-on-login flow consumes the guest cart server-side first).
 *
 * Cookie attributes: httpOnly, SameSite=Lax, Path=/, Max-Age=30 days.
 * Not `Secure` in dev — middleware sets that in production via NODE_ENV.
 */

export const CART_SESSION_COOKIE = 'cart_session';
export const CART_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Server-only: read the cart session key from the request cookies. */
export async function getCartSessionKey(): Promise<string | null> {
  // Imported dynamically so the helper stays importable from client modules
  // (which would crash on `next/headers`). The dynamic import is tree-shaken
  // out of client bundles when only the constants are referenced.
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  return jar.get(CART_SESSION_COOKIE)?.value ?? null;
}
