import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(req: Request) {
  const body = (await req.json()) as { refreshToken?: string };
  if (!body?.refreshToken) {
    return NextResponse.json({ error: 'refreshToken required' }, { status: 400 });
  }
  const jar = await cookies();
  jar.set({
    name: 'refresh_token',
    value: body.refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
  return NextResponse.json({ success: true });
}
