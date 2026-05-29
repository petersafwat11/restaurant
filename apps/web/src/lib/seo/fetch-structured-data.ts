import type { StructuredDataDto } from '@repo/types';
import { StructuredDataSchema } from '@repo/types';

/**
 * Server-side fetch of `/seo/structured-data/:slug`. The API already builds
 * the full schema.org graph (`Restaurant` + `Menu` + `AggregateRating`),
 * cached at the data layer for 1 h. Returns `null` (never throws) when the
 * API is unreachable so the calling layout can fall back to no-JSON-LD.
 *
 * Companion to `fetch-restaurant.ts` — the page-level JSON-LD wiring
 * (Phase A.1 / A.4) calls this; the locale-root layout uses the lighter
 * `fetchPublicRestaurant` since it only needs the Restaurant node.
 */
export async function fetchStructuredData(slug: string): Promise<StructuredDataDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(
      `${apiUrl.replace(/\/+$/, '')}/seo/structured-data/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 3600, tags: ['restaurant', `seo:${slug}`] },
        headers: { 'X-App-Audience': 'web' },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = StructuredDataSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
