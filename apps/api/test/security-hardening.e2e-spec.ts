import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LoyaltyService } from '../src/loyalty/loyalty.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

/**
 * Cross-cutting hardening assertions for the launch security review
 * (docs/security/pentest-checklist.md). Locks the protections so a
 * regression fails CI rather than shipping.
 */
describe('security hardening (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let userId: string;
  let restaurantId: string;
  let itemId: string;

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
        slug: 'sec-e2e',
        name: 'Sec E2E',
        phone: '+48 22 555 0012',
        email: 'sec@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
      },
      ownerToken,
    );
    restaurantId = r.json().id;
    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      { restaurantId, slug: 'mains', name: 'Mains' },
      ownerToken,
    );
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      { categoryId: cat.json().id, slug: 'dish', name: 'Dish', basePrice: '40.00' },
      ownerToken,
    );
    itemId = item.json().id;

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'sec.e2e@test.local',
      password: 'Password123!',
    });
    userToken = reg.json().accessToken;
    userId = reg.json().user.id;
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

  it('A4: rejects a tampered / garbage JWT', async () => {
    const res = await inject('GET', '/api/v1/loyalty/me', undefined, 'not.a.valid.token');
    expect(res.statusCode).toBe(401);
  });

  it('B1/B3: a customer cannot reach an admin route', async () => {
    const res = await inject('GET', '/api/v1/admin/feature-flags', undefined, userToken);
    expect(res.statusCode).toBe(403);
  });

  it('C3: POST /orders requires an Idempotency-Key', async () => {
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      userToken,
    );
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('C2/C7: loyalty redemption is capped server-side (no over-redeem)', async () => {
    const loyalty = app.get(LoyaltyService);
    await loyalty.grantPoints(userId, 100, 'seed', 'ADJUST');

    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      userToken,
    );
    // Ask to redeem far more than the 100-pt balance.
    await inject(
      'PATCH',
      `/api/v1/cart/loyalty?restaurantId=${restaurantId}`,
      { points: 999999 },
      userToken,
    );
    const order = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'Idempotency-Key': 'sec-loyalty-cap' },
    );
    expect(order.statusCode).toBe(201);
    // 100 pts → max 1.00 discount, never the requested 9999.99.
    expect(order.json().loyaltyPointsUsed).toBe(100);
    expect(order.json().discountTotal).toBe('1.00');
  });

  it('C8: an unknown referral code at signup creates no referral', async () => {
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'sec.ref.e2e@test.local',
      password: 'Password123!',
      referralCode: 'NOTREAL1',
    });
    expect(reg.statusCode).toBe(201);
    const list = await inject('GET', '/api/v1/referrals', undefined, reg.json().accessToken);
    expect(list.json().items).toHaveLength(0);
  });
});
