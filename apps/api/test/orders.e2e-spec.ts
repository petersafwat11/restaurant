import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('orders (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let otherToken: string;
  let burgerId: string;

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
    userToken = await register('alice.e2e@test.local');
    otherToken = await register('bob.e2e@test.local');

    await ensureRestaurant(app);

    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      {
        slug: 'mains',
        name: 'Mains',
      },
      ownerToken,
    );
    const categoryId = cat.json().id;

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

    // Seed alice's cart with one burger.
    await inject(
      'POST',
      `/api/v1/cart/items`,
      { menuItemId: burgerId, quantity: 2, modifierSelections: [] },
      userToken,
    );
  });

  async function inject(
    method: string,
    url: string,
    body?: unknown,
    token?: string,
    extraHeaders: Record<string, string> = {},
  ) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
    });
  }

  async function register(email: string): Promise<string> {
    const res = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    return res.json().accessToken;
  }

  it('creates an order with idempotency: same key → same orderId', async () => {
    const idempotencyKey = 'idem-1';
    const body = {
      type: 'PICKUP' as const,
      tipAmount: '0',
    };

    const r1 = await inject('POST', '/api/v1/orders', body, userToken, {
      'idempotency-key': idempotencyKey,
    });
    expect(r1.statusCode).toBe(201);
    const orderId = r1.json().id;
    expect(r1.json().orderNumber).toMatch(/^R-\d{4}-\d{6}$/);
    // 2 × 38.00 = 76.00 subtotal; default tax rate is 8% → tax 6.08; total 82.08.
    expect(r1.json().subtotal).toBe('76.00');
    expect(r1.json().taxTotal).toBe('6.08');
    expect(r1.json().grandTotal).toBe('82.08');

    const r2 = await inject('POST', '/api/v1/orders', body, userToken, {
      'idempotency-key': idempotencyKey,
    });
    expect(r2.statusCode).toBe(201);
    expect(r2.json().id).toBe(orderId);
  });

  it('concurrent POST /orders with the same Idempotency-Key never creates two orders', async () => {
    const body = { type: 'PICKUP' as const, tipAmount: '0' };
    const headers = { 'idempotency-key': 'idem-concurrent' };
    const [r1, r2] = await Promise.all([
      inject('POST', '/api/v1/orders', body, userToken, headers),
      inject('POST', '/api/v1/orders', body, userToken, headers),
    ]);

    const created = [r1, r2].filter((r) => r.statusCode === 201);
    expect(created.length).toBeGreaterThanOrEqual(1);
    // Any 201s must reference the SAME order; the loser is 201-replay or 409.
    const ids = new Set(created.map((r) => r.json().id));
    expect(ids.size).toBe(1);
    for (const r of [r1, r2]) {
      expect([201, 409]).toContain(r.statusCode);
    }

    // Exactly one order row exists for this user at this restaurant.
    const list = await inject('GET', '/api/v1/orders', undefined, userToken);
    expect(list.json().items).toHaveLength(1);
  });

  it('returns 400 when Idempotency-Key header is missing', async () => {
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0' },
      userToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('scopes order detail to the owner — other users get 404', async () => {
    const created = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'idem-scope' },
    );
    const orderId = created.json().id;

    const own = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(own.statusCode).toBe(200);

    const other = await inject('GET', `/api/v1/orders/${orderId}`, undefined, otherToken);
    expect(other.statusCode).toBe(404);

    // Owner (with `order:read`) can read it.
    const owner = await inject('GET', `/api/v1/orders/${orderId}`, undefined, ownerToken);
    expect(owner.statusCode).toBe(200);
  });

  it('applies the coupon discount correctly when present on the cart', async () => {
    // Create a 10%-off promotion and apply to alice's cart.
    const promo = await inject(
      'POST',
      '/api/v1/promotions',
      {
        name: 'Order10',
        type: 'PERCENT',
        value: '10',
      },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/promotions/${promo.json().id}/coupons`,
      {
        code: 'ORDER10',
      },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/cart/coupon`,
      { code: 'ORDER10' },
      userToken,
    );

    const res = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'idem-coupon' },
    );
    expect(res.statusCode).toBe(201);
    // 76.00 subtotal - 10% (7.60) discount = 68.40 tax base; 8% tax = 5.47;
    // grand total = 68.40 + 5.47 = 73.87.
    expect(res.json().subtotal).toBe('76.00');
    expect(res.json().discountTotal).toBe('7.60');
    expect(res.json().taxTotal).toBe('5.47');
    expect(res.json().grandTotal).toBe('73.87');
    expect(res.json().couponCode).toBe('ORDER10');
  });

  it('accepts a guest delivery order with inline deliveryAddress', async () => {
    // Guest seeds a cart via sessionKey, then places a DELIVERY order with
    // inline deliveryAddress (no signed-in user, no saved UserAddress).
    const sessionKey = 'guest-inline-1';
    await inject(
      'POST',
      `/api/v1/cart/items?sessionKey=${sessionKey}`,
      { menuItemId: burgerId, quantity: 1, modifierSelections: [] },
    );

    const res = await inject(
      'POST',
      '/api/v1/orders',
      {
        sessionKey,
        type: 'DELIVERY' as const,
        tipAmount: '0',
        deliveryAddress: {
          line1: 'ul. Marszałkowska 102',
          city: 'Warsaw',
          country: 'PL',
          geoPoint: { lat: 52.2308, lng: 21.0114 },
        },
      },
      undefined,
      { 'idempotency-key': 'idem-guest-inline' },
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('DELIVERY');
    expect(res.json().deliveryAddress).toMatchObject({
      line1: 'ul. Marszałkowska 102',
      city: 'Warsaw',
      country: 'PL',
    });
  });

  it('rejects a DELIVERY order missing both deliveryAddressId and inline deliveryAddress', async () => {
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'DELIVERY' as const, tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'idem-noaddr' },
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects a DELIVERY order whose pin falls outside the configured zones', async () => {
    // Seed a single tight polygon around (52.230, 21.010); pin is far away.
    await inject(
      'PATCH',
      `/api/v1/admin/restaurant/settings`,
      {
        deliveryZones: [
          {
            id: 'z1',
            name: 'Centrum',
            polygon: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [21.005, 52.225],
                  [21.015, 52.225],
                  [21.015, 52.235],
                  [21.005, 52.235],
                  [21.005, 52.225],
                ],
              ],
            },
          },
        ],
      },
      ownerToken,
    );

    const sessionKey = 'guest-out-of-zone';
    await inject(
      'POST',
      `/api/v1/cart/items?sessionKey=${sessionKey}`,
      { menuItemId: burgerId, quantity: 1, modifierSelections: [] },
    );

    const res = await inject(
      'POST',
      '/api/v1/orders',
      {
        sessionKey,
        type: 'DELIVERY' as const,
        tipAmount: '0',
        deliveryAddress: {
          line1: 'far away',
          city: 'Warsaw',
          country: 'PL',
          // way outside the polygon
          geoPoint: { lat: 51.5, lng: 19.0 },
        },
      },
      undefined,
      { 'idempotency-key': 'idem-out-of-zone' },
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/delivery area/i);
  });

  it('exposes the public delivery-zones list endpoint', async () => {
    await inject(
      'PATCH',
      `/api/v1/admin/restaurant/settings`,
      {
        deliveryZones: [
          {
            id: 'z1',
            name: 'Centrum',
            polygon: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [21.0, 52.2],
                  [21.05, 52.2],
                  [21.05, 52.25],
                  [21.0, 52.25],
                  [21.0, 52.2],
                ],
              ],
            },
          },
        ],
      },
      ownerToken,
    );

    const res = await inject(
      'GET',
      `/api/v1/admin/restaurant/delivery-zones`,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      zones: Array<{ id: string; name: string; polygon: unknown }>;
    };
    expect(body.zones).toHaveLength(1);
    expect(body.zones[0]).toMatchObject({ id: 'z1', name: 'Centrum' });
    // Slim public shape — no fee/minOrderAmount leak.
    expect(body.zones[0]).not.toHaveProperty('fee');
    expect(body.zones[0]).not.toHaveProperty('minOrderAmount');
  });

  it('rejects when both deliveryAddressId and inline deliveryAddress are supplied', async () => {
    const res = await inject(
      'POST',
      '/api/v1/orders',
      {
        type: 'DELIVERY' as const,
        tipAmount: '0',
        deliveryAddressId: 'addr_fake',
        deliveryAddress: {
          line1: 'a',
          city: 'b',
          country: 'PL',
          geoPoint: { lat: 52.2297, lng: 21.0122 },
        },
      },
      userToken,
      { 'idempotency-key': 'idem-bothaddr' },
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects an order when the underlying item is no longer available', async () => {
    await inject(
      'POST',
      `/api/v1/menu/items/${burgerId}/availability`,
      { isAvailable: false },
      ownerToken,
    );

    const res = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'idem-unavail' },
    );
    expect(res.statusCode).toBe(400);
  });
});
