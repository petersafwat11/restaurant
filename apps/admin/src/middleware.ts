import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Admin auth is enforced in the dashboard layout's AuthGate component — we
 * only run the next-intl middleware here to resolve the locale prefix and
 * persist the cookie.
 */
export default function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
