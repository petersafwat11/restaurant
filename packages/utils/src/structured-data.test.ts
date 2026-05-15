import { describe, expect, it } from 'vitest';
import { buildStructuredData } from './structured-data';

const base = {
  restaurant: {
    name: 'Testaurant',
    description: 'Cozy',
    url: 'https://x.test',
    telephone: '+48 1',
    email: 'a@x.test',
    image: null,
    address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
    geo: { lat: 52.2, lng: 21.0 },
  },
  aggregateRating: { ratingValue: 4.5, reviewCount: 12 },
  menu: {
    name: 'Main',
    sections: [
      { name: 'Mains', items: [{ name: 'Burger', description: null, price: '29.00' }] },
    ],
  },
  currency: 'PLN',
};

describe('structured-data', () => {
  it('emits a schema.org graph with Restaurant + Menu', () => {
    const ld = buildStructuredData(base);
    expect(ld['@context']).toBe('https://schema.org');
    const types = ld['@graph'].map((n) => n['@type']);
    expect(types).toContain('Restaurant');
    expect(types).toContain('Menu');
  });

  it('includes AggregateRating only when there are reviews', () => {
    const withR = buildStructuredData(base);
    const r = withR['@graph'][0] as Record<string, unknown>;
    expect(r.aggregateRating).toBeDefined();

    const noR = buildStructuredData({
      ...base,
      aggregateRating: { ratingValue: null, reviewCount: 0 },
    });
    expect((noR['@graph'][0] as Record<string, unknown>).aggregateRating).toBeUndefined();
  });

  it('omits the Menu node when menu is null', () => {
    const ld = buildStructuredData({ ...base, menu: null });
    expect(ld['@graph'].map((n) => n['@type'])).not.toContain('Menu');
  });
});
