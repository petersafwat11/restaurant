import type { OperatingHoursDto, RestaurantPublicDto } from '@repo/types';

/**
 * Server-Component JSON-LD emitter + restaurant schema builder.
 *
 * `<JsonLd>` renders a single `<script type="application/ld+json">` from a
 * plain object (or array of objects, which become an `@graph`). Use it in any
 * Server Component — no `'use client'`, zero hydration cost.
 *
 * `buildRestaurantSchema()` maps `RestaurantPublicDto` to a schema.org
 * `Restaurant` node suitable for site-wide injection from the marketing
 * layout. It deliberately produces ONLY the Restaurant node — for full
 * Restaurant+Menu+AggregateRating, hit the API's `/seo/structured-data/:slug`
 * endpoint (see `@repo/utils/structured-data.ts`).
 *
 * See docs/seo/seo-geo-strategy.md Part D for the per-page emission plan.
 */

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

interface JsonLdProps {
  data: JsonLdValue;
  /** Optional id, useful when emitting multiple blocks on one page. */
  id?: string;
}

/**
 * Escapes the only sequence that can break out of a `<script>` block.
 * `<\/` is treated as `</` by HTML parsers but is opaque to JSON parsers, so
 * round-tripping is safe.
 */
function safeStringify(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data, id }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : data['@context']
      ? data
      : { '@context': 'https://schema.org', ...data };

  return (
    <script
      id={id}
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script content; payload is JSON-encoded with `<` escaped.
      dangerouslySetInnerHTML={{ __html: safeStringify(payload) }}
    />
  );
}

/**
 * Map `OperatingHoursDto[]` to schema.org `OpeningHoursSpecification[]`.
 * Skips closed days. Day-of-week 0 = Sunday in our model; schema.org uses the
 * `Su, Mo, Tu, We, Th, Fr, Sa` enum.
 */
function buildOpeningHours(hours: OperatingHoursDto[] | undefined) {
  if (!hours || hours.length === 0) return undefined;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return hours
    .filter((h) => !h.isClosed)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification' as const,
      dayOfWeek: `https://schema.org/${days[h.dayOfWeek]}`,
      opens: h.opensAt,
      closes: h.closesAt,
    }));
}

interface BuildRestaurantSchemaOptions {
  /** Absolute site URL, e.g. `https://example.com` (no trailing slash). */
  siteUrl: string;
  /** Optional cuisine list — populate once `servesCuisine` lives on the DTO. */
  servesCuisine?: string[];
  /** Optional `priceRange` — schema.org expects "$" / "$$" / "$$$" / "$$$$". */
  priceRange?: string;
  /** Optional social URLs that map to schema.org `sameAs`. */
  sameAs?: string[];
}

export function buildRestaurantSchema(
  restaurant: RestaurantPublicDto,
  opts: BuildRestaurantSchemaOptions,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Restaurant',
    '@id': `${opts.siteUrl}#restaurant`,
    name: restaurant.name,
    url: opts.siteUrl,
    telephone: restaurant.phone,
    email: restaurant.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address.line1,
      addressLocality: restaurant.address.city,
      addressRegion: restaurant.address.state ?? undefined,
      postalCode: restaurant.address.zip ?? undefined,
      addressCountry: restaurant.address.country,
    },
  };

  if (restaurant.description) node.description = restaurant.description;
  if (restaurant.coverUrl || restaurant.logoUrl) {
    node.image = restaurant.coverUrl ?? restaurant.logoUrl;
  }
  if (restaurant.logoUrl) node.logo = restaurant.logoUrl;

  if (restaurant.geoPoint) {
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: restaurant.geoPoint.lat,
      longitude: restaurant.geoPoint.lng,
    };
  }

  const openingHours = buildOpeningHours(restaurant.hours);
  if (openingHours && openingHours.length > 0) {
    node.openingHoursSpecification = openingHours;
  }

  if (opts.servesCuisine && opts.servesCuisine.length > 0) {
    node.servesCuisine = opts.servesCuisine;
  }
  if (opts.priceRange) node.priceRange = opts.priceRange;
  if (opts.sameAs && opts.sameAs.length > 0) node.sameAs = opts.sameAs;

  node.currenciesAccepted = restaurant.currency;
  node.acceptsReservations = restaurant.acceptsReservations;

  return node;
}

/**
 * `BreadcrumbList` JSON-LD. Pass items in order: [{ name: 'Home', url: '/' }, …].
 * Schema.org still renders this as a rich result in 2026.
 */
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
