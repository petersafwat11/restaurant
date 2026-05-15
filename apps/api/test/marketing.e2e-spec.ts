import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('marketing (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    ownerToken = await ensureOwnerToken(app);

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'marketing-e2e',
        name: 'Marketing E2E',
        phone: '+48 22 555 0011',
        email: 'mkt@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
        geoPoint: { lat: 52.23, lng: 21.01 },
      },
      ownerToken,
    );
    restaurantId = r.json().id;

    const prisma = app.get(PrismaService);
    const cat = await prisma.menuCategory.create({
      data: { restaurantId, name: 'Mains', slug: 'mains', position: 0 },
    });
    await prisma.menuItem.create({
      data: {
        categoryId: cat.id,
        name: 'Signature Burger',
        slug: 'signature-burger',
        basePrice: '32.00',
        isFeatured: true,
        isAvailable: true,
      },
    });
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('returns landing data: featured items, rating, locations (public)', async () => {
    const res = await inject(
      'GET',
      `/api/v1/marketing/landing?restaurantId=${restaurantId}`,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.restaurant.slug).toBe('marketing-e2e');
    expect(body.featuredItems).toHaveLength(1);
    expect(body.featuredItems[0].name).toBe('Signature Burger');
    expect(body.aggregateRating.reviewCount).toBe(0);
    expect(body.locations.length).toBeGreaterThanOrEqual(1);
  });

  it('returns about data (public)', async () => {
    const res = await inject(
      'GET',
      `/api/v1/marketing/about?restaurantId=${restaurantId}`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().restaurant.email).toBe('mkt@e2e.local');
  });
});
