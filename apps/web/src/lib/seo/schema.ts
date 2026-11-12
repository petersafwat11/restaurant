import {
  type DishFacts,
  type MenuCategory,
  categoryHref,
  dishHref,
  dishImageAlt,
  getDishFacts,
} from '@/features/menu/lib/dish-facts';
import { FOUNDING_YEAR, GOOGLE_MAPS_URL, SAME_AS } from '@/lib/brand';
import type { MenuTreeDto, RestaurantPublicDto } from '@repo/types';
import { absoluteAsset, absoluteUrl, siteUrl } from './site';

/**
 * schema.org builders. One `Restaurant` node with a stable `@id` is emitted
 * site-wide from the locale layout; page-level graphs (Menu, MenuItem,
 * BreadcrumbList, FAQPage) reference it by `@id` instead of repeating it.
 *
 * Deliberately NOT emitted: `aggregateRating` for our own business (Google's
 * self-serving review policy) and any email address.
 */

type Node = Record<string, unknown>;

export function restaurantId(): string {
  return `${siteUrl()}/#restaurant`;
}

export function menuId(locale: string): string {
  return `${absoluteUrl(locale, '/menu')}#menu`;
}

const DAY_URL = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
];

/** Opening hours grouped by identical open/close times (Mon-first). */
export function openingHoursSpecification(hours: RestaurantPublicDto['hours']): Node[] {
  const groups = new Map<string, number[]>();
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const h = hours?.find((x) => x.dayOfWeek === d);
    if (!h || h.isClosed) continue;
    const key = `${h.opensAt}|${h.closesAt}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const [opens, closes] = key.split('|');
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days.map((d) => DAY_URL[d]),
      opens,
      closes,
    };
  });
}

/** First dish photo in the menu — used when no cover image is configured. */
export function firstDishImage(tree: MenuTreeDto | null): string | null {
  for (const c of tree?.categories ?? []) {
    const featured = c.items.find((i) => i.isFeatured && i.images[0]?.url);
    if (featured?.images[0]) return featured.images[0].url;
  }
  for (const c of tree?.categories ?? []) {
    const any = c.items.find((i) => i.images[0]?.url);
    if (any?.images[0]) return any.images[0].url;
  }
  return null;
}

export function buildRestaurantNode(
  r: RestaurantPublicDto,
  locale: string,
  tree: MenuTreeDto | null,
): Node {
  const base = siteUrl();
  const logo = absoluteAsset(r.logoUrl ?? '/logo.png');
  const image = r.coverUrl ?? firstDishImage(tree) ?? logo;
  const menuUrl = absoluteUrl(locale, '/menu');

  const node: Node = {
    '@type': 'Restaurant',
    '@id': restaurantId(),
    name: r.name,
    url: `${base}/`,
    logo,
    image: absoluteAsset(image),
    telephone: r.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: r.address.line1,
      addressLocality: r.address.city,
      ...(r.address.zip ? { postalCode: r.address.zip } : {}),
      ...(r.address.state ? { addressRegion: r.address.state } : {}),
      addressCountry: r.address.country,
    },
    hasMap: GOOGLE_MAPS_URL,
    servesCuisine: r.servesCuisine.length > 0 ? r.servesCuisine : ['Kebab', 'Falafel'],
    acceptsReservations: r.acceptsReservations,
    hasMenu: menuUrl,
    foundingDate: String(FOUNDING_YEAR),
    currenciesAccepted: r.currency,
    paymentAccepted: 'Cash, Credit Card, BLIK',
    sameAs: [...SAME_AS],
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: menuUrl,
        inLanguage: locale === 'en' ? 'en' : 'pl',
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: [
        ...(r.acceptsDelivery ? ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet'] : []),
        ...(r.acceptsPickup ? ['http://purl.org/goodrelations/v1#DeliveryModePickUp'] : []),
      ],
    },
  };
  if (r.description) node.description = r.description;
  if (r.priceRange) node.priceRange = r.priceRange;
  if (r.geoPoint) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: r.geoPoint.lat,
      longitude: r.geoPoint.lng,
    };
    node.areaServed = {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: r.geoPoint.lat,
        longitude: r.geoPoint.lng,
      },
      geoRadius: Math.round(r.deliveryRadiusKm * 1000),
    };
  }
  const hours = openingHoursSpecification(r.hours);
  if (hours.length > 0) node.openingHoursSpecification = hours;
  return node;
}

function dietsOf(f: Pick<DishFacts, 'isVegan' | 'isVegetarian' | 'isGlutenFree'>): string[] {
  const out: string[] = [];
  if (f.isVegan) out.push('https://schema.org/VeganDiet');
  if (f.isVegetarian || f.isVegan) out.push('https://schema.org/VegetarianDiet');
  if (f.isGlutenFree) out.push('https://schema.org/GlutenFreeDiet');
  return out;
}

function offerFor(price: string, available: boolean, url: string, name?: string): Node {
  return {
    '@type': 'Offer',
    ...(name ? { name } : {}),
    price,
    priceCurrency: 'PLN',
    availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url,
  };
}

type TreeItem = MenuCategory['items'][number];

/** `MenuItem` node. `detailed` adds one Offer per size (dish pages). */
export function buildMenuItemNode(
  category: Pick<MenuCategory, 'slug' | 'name'>,
  item: TreeItem,
  locale: string,
  detailed = false,
): Node {
  const facts = getDishFacts(item, category);
  const url = absoluteUrl(locale, dishHref(category.slug, item.slug));
  const node: Node = {
    '@type': 'MenuItem',
    '@id': `${url}#dish`,
    name: item.name,
    url,
  };
  if (item.description) node.description = item.description;
  if (facts.imageUrl) {
    node.image = {
      '@type': 'ImageObject',
      url: absoluteAsset(facts.imageUrl),
      caption: dishImageAlt(item, locale),
    };
  }
  const diets = dietsOf(facts);
  if (diets.length > 0) node.suitableForDiet = diets.length === 1 ? diets[0] : diets;
  node.offers =
    detailed && facts.sizes.length > 1
      ? facts.sizes.map((s) => offerFor(s.price, item.isAvailable, url, s.name))
      : offerFor(facts.fromPrice, item.isAvailable, url);
  return node;
}

export function buildMenuSectionNode(category: MenuCategory, locale: string): Node {
  const url = absoluteUrl(locale, categoryHref(category.slug));
  return {
    '@type': 'MenuSection',
    '@id': `${url}#section`,
    name: category.name,
    url,
    ...(category.description ? { description: category.description } : {}),
    hasMenuItem: category.items.map((i) => buildMenuItemNode(category, i, locale)),
  };
}

export function buildMenuNode(tree: MenuTreeDto, locale: string, name: string): Node {
  return {
    '@type': 'Menu',
    '@id': menuId(locale),
    name,
    url: absoluteUrl(locale, '/menu'),
    inLanguage: locale === 'en' ? 'en' : 'pl',
    provider: { '@id': restaurantId() },
    hasMenuSection: tree.categories
      .filter((c) => c.items.length > 0)
      .map((c) => buildMenuSectionNode(c, locale)),
  };
}

export interface Crumb {
  name: string;
  /** Locale-agnostic href, e.g. `/menu/kebab`. */
  href: string;
}

export function buildBreadcrumbNode(crumbs: Crumb[], locale: string): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(locale, c.href),
    })),
  };
}

export function buildFaqNode(items: { q: string; a: string }[]): Node {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}
