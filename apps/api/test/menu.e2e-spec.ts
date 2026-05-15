import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('menu (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let customerToken: string;
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
    customerToken = await register('customer.e2e@test.local');

    const res = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'test-kitchen-e2e',
        name: 'Test Kitchen E2E',
        phone: '+48 22 555 0001',
        email: 'e2e@test.local',
        address: {
          line1: 'ul. Marszałkowska 1',
          city: 'Warsaw',
          zip: '00-001',
          country: 'PL',
        },
        timezone: 'Europe/Warsaw',
        currency: 'PLN',
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(201);
    restaurantId = res.json().id;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  async function register(email: string): Promise<string> {
    const res = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    return res.json().accessToken;
  }

  it('returns a public menu tree', async () => {
    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      {
        restaurantId,
        slug: 'starters',
        name: 'Starters',
      },
      ownerToken,
    );
    expect(cat.statusCode).toBe(201);
    const categoryId = cat.json().id;

    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId,
        slug: 'zurek',
        name: 'Żurek',
        basePrice: '22.00',
      },
      ownerToken,
    );
    expect(item.statusCode).toBe(201);

    const tree = await inject('GET', `/api/v1/restaurants/${restaurantId}/menu`);
    expect(tree.statusCode).toBe(200);
    const body = tree.json();
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].slug).toBe('starters');
    expect(body.categories[0].items).toHaveLength(1);
    expect(body.categories[0].items[0].basePrice).toBe('22.00');
  });

  it('forbids non-admin from creating categories', async () => {
    const res = await inject(
      'POST',
      '/api/v1/menu/categories',
      { restaurantId, slug: 'mains', name: 'Mains' },
      customerToken,
    );
    expect(res.statusCode).toBe(403);
  });

  it('invalidates the menu cache on item mutation', async () => {
    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      { restaurantId, slug: 'mains', name: 'Mains' },
      ownerToken,
    );
    const categoryId = cat.json().id;
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      { categoryId, slug: 'kotlet', name: 'Kotlet', basePrice: '48.00' },
      ownerToken,
    );
    const itemId = item.json().id;

    // Prime the cache.
    const before = await inject('GET', `/api/v1/restaurants/${restaurantId}/menu`);
    expect(before.json().categories[0].items[0].basePrice).toBe('48.00');

    // Mutate.
    const upd = await inject(
      'PATCH',
      `/api/v1/menu/items/${itemId}`,
      { basePrice: '55.00' },
      ownerToken,
    );
    expect(upd.statusCode).toBe(200);

    // Cache should be busted → fresh data.
    const after = await inject('GET', `/api/v1/restaurants/${restaurantId}/menu`);
    expect(after.json().categories[0].items[0].basePrice).toBe('55.00');
  });
});
