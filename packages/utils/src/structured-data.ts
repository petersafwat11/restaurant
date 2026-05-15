/**
 * schema.org JSON-LD builders (Restaurant / Menu / AggregateRating). Pure —
 * the API wraps these in an endpoint; the UI sprint injects the output into a
 * <script type="application/ld+json">. No runtime deps.
 */

export interface StructuredDataInput {
  restaurant: {
    name: string;
    description: string | null;
    url: string;
    telephone: string;
    email: string;
    image: string | null;
    address: {
      line1?: string;
      line2?: string | null;
      city?: string;
      state?: string | null;
      zip?: string | null;
      country?: string;
    };
    geo: { lat: number; lng: number } | null;
    servesCuisine?: string | null;
    priceRange?: string | null;
  };
  aggregateRating: { ratingValue: number | null; reviewCount: number };
  menu: {
    name: string;
    sections: {
      name: string;
      items: { name: string; description: string | null; price: string }[];
    }[];
  } | null;
  currency: string;
}

type JsonLdNode = Record<string, unknown>;

export function buildStructuredData(input: StructuredDataInput): {
  '@context': 'https://schema.org';
  '@graph': JsonLdNode[];
} {
  const r = input.restaurant;
  const restaurantNode: JsonLdNode = {
    '@type': 'Restaurant',
    '@id': `${r.url}#restaurant`,
    name: r.name,
    url: r.url,
    telephone: r.telephone,
    email: r.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [r.address.line1, r.address.line2].filter(Boolean).join(', '),
      addressLocality: r.address.city ?? '',
      addressRegion: r.address.state ?? '',
      postalCode: r.address.zip ?? '',
      addressCountry: r.address.country ?? '',
    },
  };
  if (r.description) restaurantNode.description = r.description;
  if (r.image) restaurantNode.image = r.image;
  if (r.servesCuisine) restaurantNode.servesCuisine = r.servesCuisine;
  if (r.priceRange) restaurantNode.priceRange = r.priceRange;
  if (r.geo) {
    restaurantNode.geo = {
      '@type': 'GeoCoordinates',
      latitude: r.geo.lat,
      longitude: r.geo.lng,
    };
  }
  if (input.aggregateRating.reviewCount > 0 && input.aggregateRating.ratingValue != null) {
    restaurantNode.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const graph: JsonLdNode[] = [restaurantNode];

  if (input.menu) {
    graph.push({
      '@type': 'Menu',
      '@id': `${r.url}#menu`,
      name: input.menu.name,
      hasMenuSection: input.menu.sections.map((s) => ({
        '@type': 'MenuSection',
        name: s.name,
        hasMenuItem: s.items.map((it) => ({
          '@type': 'MenuItem',
          name: it.name,
          ...(it.description ? { description: it.description } : {}),
          offers: {
            '@type': 'Offer',
            price: it.price,
            priceCurrency: input.currency,
          },
        })),
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
