import { env } from '@/lib/env';

// Data-only proxy to the API's robots.txt (GET /seo/robots.txt).
export const revalidate = 86400;

export async function GET() {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/seo/robots.txt`, {
    next: { revalidate: 86400 },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
