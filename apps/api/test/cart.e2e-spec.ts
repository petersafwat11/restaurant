import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('cart (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let restaurantId: string;
  let categoryId: string;
  let burgerId: string;
  let pizzaId: string;
  let pizzaSizeGroupId: string;
  let smallSizeOptionId: string;
  let largeSizeOptionId: string;

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
    userToken = await register('user.e2e@test.local');

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'cart-e2e',
        name: 'Cart E2E',
        phone: '+48 22 555 0001',
        email: 'cart@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
      },
      ownerToken,
    );
    expect(r.statusCode).toBe(201);
    restaurantId = r.json().id;

    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      {
        restaurantId,
        slug: 'mains',
        name: 'Mains',
      },
      ownerToken,
    );
    categoryId = cat.json().id;

    const burger = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId,
        slug: 'burger',
        name: 'Burger',
        basePrice: '38.00',
      },
      ownerToken,
    );
    burgerId = burger.json().id;

    const pizza = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId,
        slug: 'pizza',
        name: 'Pizza',
        basePrice: '35.00',
      },
      ownerToken,
    );
    pizzaId = pizza.json().id;

    const group = await inject(
      'POST',
      `/api/v1/menu/items/${pizzaId}/modifier-groups`,
      {
        name: 'Size',
        isRequired: true,
        minSelect: 1,
        maxSelect: 1,
      },
      ownerToken,
    );
    pizzaSizeGroupId = group.json().id;

    const small = await inject(
      'POST',
      `/api/v1/menu/modifier-groups/${pizzaSizeGroupId}/options`,
      {
        name: 'Small',
        priceDelta: '0',
      },
      ownerToken,
    );
    smallSizeOptionId = small.json().id;

    const large = await inject(
      'POST',
      `/api/v1/menu/modifier-groups/${pizzaSizeGroupId}/options`,
      {
        name: 'Large',
        priceDelta: '12.00',
      },
      ownerToken,
    );
    largeSizeOptionId = large.json().id;
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

  it('adds and updates and removes items as an authed user', async () => {
    const add = await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: burgerId, quantity: 2, modifierSelections: [] },
      userToken,
    );
    expect(add.statusCode).toBe(201);
    expect(add.json().items).toHaveLength(1);
    expect(add.json().items[0].quantity).toBe(2);
    expect(add.json().totals.subtotal).toBe('76.00');

    const itemId = add.json().items[0].id;

    const upd = await inject('PATCH', `/api/v1/cart/items/${itemId}`, { quantity: 3 }, userToken);
    expect(upd.statusCode).toBe(200);
    expect(upd.json().items[0].quantity).toBe(3);
    expect(upd.json().totals.subtotal).toBe('114.00');

    const del = await inject('DELETE', `/api/v1/cart/items/${itemId}`, undefined, userToken);
    expect(del.statusCode).toBe(200);
    expect(del.json().items).toHaveLength(0);
  });

  it('rejects an item where a required modifier group is missing', async () => {
    const res = await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: pizzaId, quantity: 1, modifierSelections: [] },
      userToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('computes unit price from modifier deltas, ignoring any client-sent price', async () => {
    const res = await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      {
        menuItemId: pizzaId,
        quantity: 1,
        modifierSelections: [{ groupId: pizzaSizeGroupId, optionIds: [largeSizeOptionId] }],
      },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    // 35.00 base + 12.00 large = 47.00
    expect(res.json().items[0].unitPrice).toBe('47.00');
  });

  it('merges a guest cart into the authed user cart, collapsing duplicates', async () => {
    const sessionKey = 'session-merge-e2e';
    // Guest adds a burger.
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}&sessionKey=${sessionKey}`,
      { menuItemId: burgerId, quantity: 1, modifierSelections: [] },
    );
    // Authed user also adds a burger.
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: burgerId, quantity: 2, modifierSelections: [] },
      userToken,
    );

    const merge = await inject(
      'POST',
      '/api/v1/cart/merge',
      { sessionKey, restaurantId },
      userToken,
    );
    expect(merge.statusCode).toBe(201);
    expect(merge.json().items).toHaveLength(1);
    expect(merge.json().items[0].quantity).toBe(3);
  });
});
