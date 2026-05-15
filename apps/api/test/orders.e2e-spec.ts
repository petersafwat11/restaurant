import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('orders (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let otherToken: string;
  let restaurantId: string;
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

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'orders-e2e',
        name: 'Orders E2E',
        phone: '+48 22 555 0001',
        email: 'orders@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
      },
      ownerToken,
    );
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
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
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
      restaurantId,
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
    const body = { restaurantId, type: 'PICKUP' as const, tipAmount: '0' };
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
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('scopes order detail to the owner — other users get 404', async () => {
    const created = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
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
        restaurantId,
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
      `/api/v1/cart/coupon?restaurantId=${restaurantId}`,
      { code: 'ORDER10' },
      userToken,
    );

    const res = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
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
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'idem-unavail' },
    );
    expect(res.statusCode).toBe(400);
  });
});
