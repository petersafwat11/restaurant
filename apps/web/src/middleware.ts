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

// Auth cookies are named per audience (see apps/api/src/common/auth/cookies.ts):
//   web_at  = access token
//   web_rt  = refresh token
// We probe for either — the access token is short-lived and may have expired
// even when the user is still logged in via the refresh token.
const AUTH_COOKIE_NAMES = ['web_rt', 'web_at'] as const;

export default function middleware(req: NextRequest) {
  const path = stripLocale(req.nextUrl.pathname);
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  const hasAuthCookie = AUTH_COOKIE_NAMES.some((name) => !!req.cookies.get(name)?.value);

  if (isProtected && !hasAuthCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Strip the locale from the redirect target — the locale-aware
    // `useRouter().push()` on the login page re-applies it, and `/en/account`
    // would otherwise become `/en/en/account`.
    url.searchParams.set('redirect', stripLocale(req.nextUrl.pathname));
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
