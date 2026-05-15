import { env } from '@/lib/env';

// Data-only proxy to the API's generated sitemap. UI sprint may swap this for
// a native Next MetadataRoute.Sitemap if preferred — the source of truth is
// the API (GET /seo/sitemap.xml).
export const revalidate = 3600;

export async function GET() {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/seo/sitemap.xml`, {
    next: { revalidate: 3600 },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
