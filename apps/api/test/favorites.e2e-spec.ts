import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('favorites (e2e)', () => {
  let app: NestFastifyApplication;
  let userToken: string;
  let menuItemId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    await ensureOwnerToken(app);

    const prisma = app.get(PrismaService);
    const restaurant = await prisma.restaurant.create({
      data: {
        slug: 'fav-e2e',
        name: 'Fav E2E',
        phone: '+48 22 555 0010',
        email: 'fav@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
        currency: 'PLN',
      },
    });
    const category = await prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: 'Mains', slug: 'mains' },
    });
    const item = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name: 'Burger',
        slug: 'burger',
        basePrice: '25.00',
      },
    });
    menuItemId = item.id;

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'fav.e2e@test.local',
      password: 'Password123!',
    });
    userToken = reg.json().accessToken;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('adds, lists and removes a favorite (idempotent add)', async () => {
    const add1 = await inject('PUT', `/api/v1/favorites/${menuItemId}`, undefined, userToken);
    expect(add1.statusCode).toBe(200);
    expect(add1.json().menuItem.id).toBe(menuItemId);

    // Idempotent — adding again is a no-op, still 200.
    const add2 = await inject('PUT', `/api/v1/favorites/${menuItemId}`, undefined, userToken);
    expect(add2.statusCode).toBe(200);

    const list = await inject('GET', '/api/v1/favorites', undefined, userToken);
    expect(list.json().items).toHaveLength(1);

    const ids = await inject('GET', '/api/v1/favorites/ids', undefined, userToken);
    expect(ids.json().menuItemIds).toEqual([menuItemId]);

    const del = await inject('DELETE', `/api/v1/favorites/${menuItemId}`, undefined, userToken);
    expect(del.statusCode).toBe(200);
    expect(del.json().removed).toBe(true);

    const after = await inject('GET', '/api/v1/favorites', undefined, userToken);
    expect(after.json().items).toHaveLength(0);
  });

  it('requires auth', async () => {
    const res = await inject('GET', '/api/v1/favorites');
    expect(res.statusCode).toBe(401);
  });
});
