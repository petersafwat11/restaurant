import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Auth-protected route prefixes. The Next route-group syntax `(account)`
 * doesn't appear in the URL, so we list the actual paths that live under
 * `apps/web/src/app/[locale]/(account)/...` plus the legacy `/profile` +
 * `/addresses` paths kept for back-compat with existing tests.
 *
 * The shop (cart/checkout) is intentionally NOT in this list — guest
 * checkout is a real flow. Order tracking via `/track/[orderId]` is also
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

function stripLocale(pathname: string): string {
  const seg = pathname.split('/')[1];
  if (seg && (routing.locales as readonly string[]).includes(seg)) {
    return `/${pathname.split('/').slice(2).join('/')}`.replace(/\/+$/, '') || '/';
  }
  return pathname;
}

export default function middleware(req: NextRequest) {
  const path = stripLocale(req.nextUrl.pathname);
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !req.cookies.get('refresh_token')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
