/**
 * Phase H4 — production image checker for menu + marketing data.
 *
 * The owner cannot ship licensed photography from here, so this provides the
 * tooling to FIND imagery that must be replaced:
 *
 *  - `flagExternalImages()` is a pure classifier (always tested): given image
 *    URLs, it flags anything that is external/stock (Unsplash, other CDNs) or
 *    empty, i.e. not an owner-hosted/relative asset.
 *
 *  - An opt-in live check (skipped unless `CHECK_LIVE_IMAGES=1`) fetches the
 *    real `/menu` and `/restaurant` from `IMAGE_CHECK_API_URL` and reports any
 *    flagged image so the owner can swap it for a licensed upload.
 *
 * Run the live check against production:
 *   CHECK_LIVE_IMAGES=1 IMAGE_CHECK_API_URL=https://api.szefdonald.pl/api/v1 \
 *     pnpm --filter @repo/web test image-checker
 */
import { server } from '@/test/setup';
import type { MenuTreeDto, RestaurantPublicDto } from '@repo/types';
import { http, passthrough } from 'msw';
import { describe, expect, it } from 'vitest';

interface FlaggedImage {
  url: string;
  where: string;
  reason: 'external-host' | 'unsplash' | 'empty';
}

/**
 * Hosts we consider owner-controlled. A relative URL (uploaded asset served
 * from our own domain) is always allowed. Extend `ownHosts` if production
 * serves images from an additional first-party CDN.
 */
function flagExternalImages(
  images: { url: string | null | undefined; where: string }[],
  ownHosts: string[] = [],
): FlaggedImage[] {
  const flagged: FlaggedImage[] = [];
  for (const { url, where } of images) {
    if (!url || url.trim() === '') {
      flagged.push({ url: url ?? '', where, reason: 'empty' });
      continue;
    }
    // Relative / same-origin uploads are fine.
    if (url.startsWith('/') || url.startsWith('data:')) continue;
    let host: string;
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      // Not an absolute URL and not root-relative → treat as suspect.
      flagged.push({ url, where, reason: 'external-host' });
      continue;
    }
    if (host.includes('unsplash.com')) {
      flagged.push({ url, where, reason: 'unsplash' });
      continue;
    }
    if (!ownHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      flagged.push({ url, where, reason: 'external-host' });
    }
  }
  return flagged;
}

/** Collect every image reference out of a menu tree (categories + items). */
function collectMenuImages(
  tree: MenuTreeDto,
): { url: string | null | undefined; where: string }[] {
  const out: { url: string | null | undefined; where: string }[] = [];
  for (const c of tree.categories) {
    if (c.imageUrl) out.push({ url: c.imageUrl, where: `category:${c.slug}` });
    for (const i of c.items) {
      for (const [idx, img] of i.images.entries()) {
        out.push({ url: img.url, where: `item:${i.slug}#${idx}` });
      }
    }
  }
  return out;
}

function collectRestaurantImages(
  r: RestaurantPublicDto,
): { url: string | null | undefined; where: string }[] {
  return [
    { url: r.logoUrl, where: 'restaurant:logoUrl' },
    { url: r.coverUrl, where: 'restaurant:coverUrl' },
  ].filter((x) => x.url != null);
}

describe('flagExternalImages (H4 classifier)', () => {
  it('flags Unsplash and other external hosts, allows own/relative assets', () => {
    const flagged = flagExternalImages(
      [
        { url: 'https://images.unsplash.com/photo-123', where: 'item:a' },
        { url: 'https://cdn.example.net/x.jpg', where: 'item:b' },
        { url: '/uploads/real-dish.jpg', where: 'item:c' },
        { url: 'https://uploads.szefdonald.pl/cover.jpg', where: 'restaurant:cover' },
        { url: '', where: 'item:d' },
        { url: null, where: 'item:e' },
      ],
      ['szefdonald.pl'],
    );

    const byWhere = Object.fromEntries(flagged.map((f) => [f.where, f.reason]));
    expect(byWhere['item:a']).toBe('unsplash');
    expect(byWhere['item:b']).toBe('external-host');
    expect(byWhere['item:c']).toBeUndefined(); // relative upload OK
    expect(byWhere['restaurant:cover']).toBeUndefined(); // first-party host OK
    expect(byWhere['item:d']).toBe('empty');
    expect(byWhere['item:e']).toBe('empty');
  });
});

describe('live menu/marketing image audit (opt-in)', () => {
  const enabled = process.env.CHECK_LIVE_IMAGES === '1';
  const apiUrl = (process.env.IMAGE_CHECK_API_URL ?? '').replace(/\/+$/, '');
  const ownHosts = (process.env.IMAGE_CHECK_OWN_HOSTS ?? 'szefdonald.pl')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  it.skipIf(!enabled)('flags external/Unsplash images served by the live API', async () => {
    expect(apiUrl, 'set IMAGE_CHECK_API_URL to the live API base').not.toBe('');

    // The global test server runs with `onUnhandledRequest: 'error'`, so let
    // real requests to the configured API host through (afterEach resets this).
    server.use(http.all(`${apiUrl}/*`, () => passthrough()));

    const [tree, restaurant] = await Promise.all([
      fetch(`${apiUrl}/menu`).then((r) => r.json() as Promise<MenuTreeDto>),
      fetch(`${apiUrl}/restaurant`).then((r) => r.json() as Promise<RestaurantPublicDto>),
    ]);

    const flagged = flagExternalImages(
      [...collectMenuImages(tree), ...collectRestaurantImages(restaurant)],
      ownHosts,
    );

    if (flagged.length > 0) {
      // Surface the full list so the owner knows exactly what to replace.
      console.warn(
        `[image-checker] ${flagged.length} image(s) need owner-supplied licensed replacements:\n${flagged
          .map((f) => `  - ${f.where}: [${f.reason}] ${f.url}`)
          .join('\n')}`,
      );
    }
    expect(flagged, 'live API is serving external/stock imagery (see warning above)').toEqual([]);
  });
});
