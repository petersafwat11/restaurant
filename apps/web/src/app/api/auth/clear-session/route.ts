import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const jar = await cookies();
  jar.delete('refresh_token');
  return NextResponse.json({ success: true });
}
