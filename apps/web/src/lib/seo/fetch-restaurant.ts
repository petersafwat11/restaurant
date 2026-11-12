import type { RestaurantPublicDto } from '@repo/types';
import { RestaurantPublicSchema } from '@repo/types';
import { cache } from 'react';
import { apiBase } from './fetch-menu';

/** Revalidation window for public restaurant data (address, hours, delivery). */
export const RESTAURANT_REVALIDATE_SECONDS = 300;

/**
 * Server-side public-restaurant fetch for layouts/pages that need NAP, hours
 * and delivery terms in the initial HTML (crawlers and AI bots don't run JS).
 *
 * Cached in the Next data cache (`revalidate: 300`, tag `restaurant`) so hot
 * paths don't hit the API per request. Returns `null` (never throws) when the
 * API is unreachable — callers degrade gracefully.
 */
export const fetchPublicRestaurant = cache(
  async function fetchPublicRestaurant(): Promise<RestaurantPublicDto | null> {
    const base = await apiBase();
    if (!base) return null;

    try {
      const res = await fetch(`${base}/restaurant`, {
        next: { revalidate: RESTAURANT_REVALIDATE_SECONDS, tags: ['restaurant'] },
        headers: { 'X-App-Audience': 'web' },
      });
      if (!res.ok) return null;
      const parsed = RestaurantPublicSchema.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
);
