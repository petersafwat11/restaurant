import type { RestaurantPublicDto } from '@repo/types';
import { RestaurantPublicSchema } from '@repo/types';

/**
 * Server-side public-restaurant fetch for use in layouts that need to emit
 * JSON-LD. Uses the same API endpoint the client `restaurant.get()` calls but
 * lives outside the `'use client'`-tainted `getApiClient()` wrapper.
 *
 * Cached at the Next data layer with `revalidate: 3600` so hot paths don't
 * hit the API on every render. Returns `null` (never throws) if the API is
 * unreachable — the calling layout falls back to no-JSON-LD rather than
 * crashing the request.
 */
export async function fetchPublicRestaurant(): Promise<RestaurantPublicDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/restaurant`, {
      next: { revalidate: 3600, tags: ['restaurant'] },
      headers: { 'X-App-Audience': 'web' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = RestaurantPublicSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
