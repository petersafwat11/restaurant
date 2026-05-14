import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/** Reads the httpOnly refresh cookie for client-side refresh flow. */
export async function GET() {
  const jar = await cookies();
  const token = jar.get('refresh_token')?.value ?? null;
  return NextResponse.json({ refreshToken: token });
}
