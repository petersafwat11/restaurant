import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LoyaltyService } from '../src/loyalty/loyalty.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('loyalty earn/redeem (e2e)', () => {
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
        slug: 'loyal-e2e',
        name: 'Loyal E2E',
        phone: '+48 22 555 0011',
        email: 'loyal@e2e.local',
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
      { categoryId: cat.json().id, slug: 'pizza', name: 'Pizza', basePrice: '50.00' },
      ownerToken,
    );
    itemId = item.json().id;

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'earner.e2e@test.local',
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

  it('earns floor(grandTotal - tip) points, idempotently per order', async () => {
    const prisma = app.get(PrismaService);
    const loyalty = app.get(LoyaltyService);
    const order = await prisma.order.create({
      data: {
        orderNumber: `R-EARN-${Math.random().toString(36).slice(2, 8)}`,
        userId,
        restaurantId,
        type: 'PICKUP',
        status: 'COMPLETED',
        subtotal: '50.00',
        taxTotal: '4.00',
        tipAmount: '5.00',
        grandTotal: '59.00',
        currency: 'PLN',
      },
    });

    await loyalty.earnForOrder(order.id);
    await loyalty.earnForOrder(order.id); // idempotent

    const me = await inject('GET', '/api/v1/loyalty/me', undefined, userToken);
    expect(me.json().points).toBe(54); // 59 - 5 tip
    expect(me.json().lifetimePoints).toBe(54);

    // Reversal on refund: earned points revoked, not negative.
    await loyalty.reverseForOrder(order.id);
    const after = await inject('GET', '/api/v1/loyalty/me', undefined, userToken);
    expect(after.json().points).toBe(0);
  });

  it('quotes a redemption without trusting a client money value', async () => {
    const loyalty = app.get(LoyaltyService);
    await loyalty.grantPoints(userId, 1000, 'seed', 'ADJUST');

    const q = await inject(
      'POST',
      '/api/v1/loyalty/redeem/quote',
      { points: 300, subtotal: '50.00' },
      userToken,
    );
    expect(q.statusCode).toBe(201);
    expect(q.json().appliablePoints).toBe(300);
    expect(q.json().discountAmount).toBe('3.00');
  });

  it('redeems points at checkout as a server-computed discount', async () => {
    const loyalty = app.get(LoyaltyService);
    await loyalty.grantPoints(userId, 1000, 'seed', 'ADJUST');

    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      userToken,
    );
    await inject(
      'PATCH',
      `/api/v1/cart/loyalty?restaurantId=${restaurantId}`,
      { points: 500 },
      userToken,
    );

    const order = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'Idempotency-Key': 'loyalty-redeem-1' },
    );
    expect(order.statusCode).toBe(201);
    // 500 points → 5.00 discount on a 50.00 subtotal.
    expect(order.json().discountTotal).toBe('5.00');
    expect(order.json().loyaltyPointsUsed).toBe(500);

    const me = await inject('GET', '/api/v1/loyalty/me', undefined, userToken);
    expect(me.json().points).toBe(500); // 1000 - 500 burned
  });

  it('caps redemption against the post-coupon subtotal (no wasted point burn)', async () => {
    const loyalty = app.get(LoyaltyService);
    await loyalty.grantPoints(userId, 5000, 'seed', 'ADJUST');

    // 80%-off coupon on a 50.00 subtotal → 40.00 coupon discount,
    // leaving only 10.00 of subtotal for loyalty to discount.
    const promo = await inject(
      'POST',
      '/api/v1/promotions',
      { restaurantId, name: '80 off', type: 'PERCENT', value: '80' },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/promotions/${promo.json().id}/coupons`,
      { code: 'EIGHTY' },
      ownerToken,
    );

    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      userToken,
    );
    await inject(
      'POST',
      `/api/v1/cart/coupon?restaurantId=${restaurantId}`,
      { code: 'EIGHTY' },
      userToken,
    );
    // Ask to redeem far more than the post-coupon remainder allows.
    await inject(
      'PATCH',
      `/api/v1/cart/loyalty?restaurantId=${restaurantId}`,
      { points: 5000 },
      userToken,
    );

    const order = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'Idempotency-Key': 'loyalty-coupon-cap' },
    );
    expect(order.statusCode).toBe(201);
    // 40 coupon + 10 loyalty = 50 total discount (never clamped away).
    expect(order.json().discountTotal).toBe('50.00');
    // Only 1000 pts ($10) burned — not the requested 5000.
    expect(order.json().loyaltyPointsUsed).toBe(1000);

    const me = await inject('GET', '/api/v1/loyalty/me', undefined, userToken);
    expect(me.json().points).toBe(4000); // 5000 - 1000 burned
  });
});
