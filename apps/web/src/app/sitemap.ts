import { categoryHref, dishHref, latestUpdate } from '@/features/menu/lib/dish-facts';
import { routing } from '@/i18n/routing';
import { getAlternates } from '@/lib/seo/alternates';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { absoluteAsset, absoluteUrl } from '@/lib/seo/site';
import type { MetadataRoute } from 'next';

/**
 * Sitemap with every public page in both locales, hreflang alternates
 * (pl / en / x-default), real `lastmod` from the menu's `updatedAt` for
 * menu-driven pages, and image entries for dish photos.
 *
 * Rendered per request (the menu fetch is cached 300 s), so it never ships
 * the build-time state when the API was unreachable.
 */
export const dynamic = 'force-dynamic';

/** Last substantive edit of the static copy pages (bump when copy changes). */
const CONTENT_UPDATED = new Date('2026-11-12T00:00:00Z');

const STATIC_ROUTES: Array<{ href: string; priority: number; menuDriven?: boolean }> = [
  { href: '/', priority: 1.0, menuDriven: true },
  { href: '/menu', priority: 0.9, menuDriven: true },
  { href: '/kebab-kielce', priority: 0.9, menuDriven: true },
  { href: '/falafel-kielce', priority: 0.8, menuDriven: true },
  { href: '/kapsalon-kielce', priority: 0.8, menuDriven: true },
  { href: '/dostawa', priority: 0.8 },
  { href: '/faq', priority: 0.7 },
  { href: '/about', priority: 0.6 },
  { href: '/locations', priority: 0.7 },
  { href: '/contact', priority: 0.5 },
  { href: '/reservations', priority: 0.3 },
  { href: '/terms', priority: 0.2 },
  { href: '/privacy', priority: 0.2 },
  { href: '/cookies', priority: 0.1 },
  { href: '/refunds-complaints', priority: 0.2 },
  { href: '/delivery-cancellation', priority: 0.2 },
  { href: '/promotion-terms', priority: 0.1 },
];

function entriesFor(
  href: string,
  opts: { lastModified: Date; priority: number; images?: string[] },
): MetadataRoute.Sitemap {
  const { languages } = getAlternates(href);
  return routing.locales.map((locale) => ({
    url: absoluteUrl(locale, href),
    lastModified: opts.lastModified,
    changeFrequency: 'weekly' as const,
    priority: opts.priority,
    alternates: { languages },
    ...(opts.images && opts.images.length > 0 ? { images: opts.images } : {}),
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tree = await fetchMenuTree(routing.defaultLocale);
  const categories = (tree?.categories ?? []).filter((c) => c.items.length > 0);
  const menuUpdated = latestUpdate(categories.flatMap((c) => c.items)) ?? CONTENT_UPDATED;

  const out: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((r) =>
    entriesFor(r.href, {
      lastModified: r.menuDriven ? menuUpdated : CONTENT_UPDATED,
      priority: r.priority,
    }),
  );

  for (const c of categories) {
    out.push(
      ...entriesFor(categoryHref(c.slug), {
        lastModified: latestUpdate(c.items) ?? menuUpdated,
        priority: 0.7,
        images: c.imageUrl ? [absoluteAsset(c.imageUrl)] : undefined,
      }),
    );
    for (const item of c.items) {
      out.push(
        ...entriesFor(dishHref(c.slug, item.slug), {
          lastModified: latestUpdate([item]) ?? menuUpdated,
          priority: item.isFeatured ? 0.8 : 0.6,
          images: item.images.map((img) => absoluteAsset(img.url)),
        }),
      );
    }
  }
  return out;
}
