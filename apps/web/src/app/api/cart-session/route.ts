import { CART_SESSION_COOKIE, CART_SESSION_MAX_AGE_SECONDS } from '@/lib/cart-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Cart session bootstrap route.
 *
 * POST /api/cart-session
 *   - If `cart_session` cookie exists, returns it as-is.
 *   - Otherwise mints a fresh UUID, sets the cookie (httpOnly, SameSite=Lax),
 *     and returns it.
 *
 * Idempotent — safe to call on every guest first paint.
 *
 * The cookie is httpOnly so JS can't read it directly; client code that needs
 * the value receives it via the JSON response and stashes it in the
 * <CartSessionProvider> for the rest of the session. Subsequent requests
 * still ride the cookie, so SSR sees the same key.
 */
export async function POST() {
  const jar = await cookies();
  const existing = jar.get(CART_SESSION_COOKIE)?.value;
  if (existing) {
    return NextResponse.json({ sessionKey: existing });
  }

  const sessionKey = crypto.randomUUID();
  jar.set({
    name: CART_SESSION_COOKIE,
    value: sessionKey,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: CART_SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return NextResponse.json({ sessionKey });
}

/**
 * DELETE /api/cart-session
 *   Called by the merge-on-login flow after the guest cart has been merged
 *   server-side. Clears the cookie so subsequent requests are user-scoped.
 */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(CART_SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}
