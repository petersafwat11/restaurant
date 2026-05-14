import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/profile', '/addresses'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
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
  matcher: ['/profile/:path*', '/addresses/:path*'],
};
