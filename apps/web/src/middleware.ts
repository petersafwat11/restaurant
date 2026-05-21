import { type NextRequest, NextResponse } from 'next/server';

/**
 * Auth-protected route prefixes. The Next route-group syntax `(account)`
 * doesn't appear in the URL, so we list the actual paths that live under
 * `apps/web/src/app/(account)/...` plus the legacy `/profile` + `/addresses`
 * paths kept for back-compat with existing tests.
 *
 * The shop (cart/checkout) is intentionally NOT in this list — guest
 * checkout is a real flow. Order tracking via `/orders/[orderId]` is also
 * public (signed-token deep-link from email).
 */
const PROTECTED_PREFIXES = [
  '/account',
  '/profile',
  '/addresses',
  '/loyalty',
  '/referrals',
  '/notifications',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const refresh = req.cookies.get('refresh_token')?.value;
  if (!refresh) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/profile/:path*',
    '/addresses/:path*',
    '/loyalty/:path*',
    '/referrals/:path*',
    '/notifications/:path*',
  ],
};
