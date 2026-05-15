import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('orders admin list + detail enrichment (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let aliceToken: string;
  let bobToken: string;
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
    aliceToken = await register('alice.e2e@test.local');
    bobToken = await register('bob.e2e@test.local');

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'orders-admin-e2e',
        name: 'Orders Admin E2E',
        phone: '+48 22 555 0009',
        email: 'oadmin@e2e.local',
        address: { line1: 'ul. 9', city: 'Warsaw', country: 'PL' },
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
      { categoryId: cat.json().id, slug: 'burger', name: 'Burger', basePrice: '38.00' },
      ownerToken,
    );
    itemId = item.json().id;
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

  async function seedCart(token: string) {
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      token,
    );
  }

  async function createOrder(
    token: string,
    type: 'PICKUP' | 'DINE_IN',
    idem: string,
  ): Promise<{ id: string; orderNumber: string }> {
    await seedCart(token);
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type, tipAmount: '0' },
      token,
      { 'idempotency-key': idem },
    );
    expect(res.statusCode).toBe(201);
    return { id: res.json().id, orderNumber: res.json().orderNumber };
  }

  it('staff with order:read + restaurantId list all restaurant orders; customers see only their own', async () => {
    await createOrder(aliceToken, 'PICKUP', 'oa-1');
    await createOrder(aliceToken, 'DINE_IN', 'oa-2');
    await createOrder(bobToken, 'PICKUP', 'oa-3');

    const adminList = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}`,
      undefined,
      ownerToken,
    );
    expect(adminList.statusCode).toBe(200);
    expect(adminList.json().items).toHaveLength(3);

    const aliceOwn = await inject('GET', '/api/v1/orders', undefined, aliceToken);
    expect(aliceOwn.json().items).toHaveLength(2);

    // Customer passing restaurantId can't escalate — filter is ignored, still own.
    const aliceEscalate = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}`,
      undefined,
      aliceToken,
    );
    expect(aliceEscalate.json().items).toHaveLength(2);
  });

  it('filters the admin list by type and search', async () => {
    const a1 = await createOrder(aliceToken, 'PICKUP', 'oa-f1');
    await createOrder(aliceToken, 'DINE_IN', 'oa-f2');

    const byType = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}&type=DINE_IN`,
      undefined,
      ownerToken,
    );
    expect(byType.json().items).toHaveLength(1);
    expect(byType.json().items[0].type).toBe('DINE_IN');

    const bySearch = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}&search=${encodeURIComponent(a1.orderNumber)}`,
      undefined,
      ownerToken,
    );
    expect(bySearch.json().items).toHaveLength(1);
    expect(bySearch.json().items[0].id).toBe(a1.id);
  });

  it('cursor-paginates the admin list', async () => {
    await createOrder(aliceToken, 'PICKUP', 'oa-p1');
    await createOrder(aliceToken, 'PICKUP', 'oa-p2');
    await createOrder(aliceToken, 'PICKUP', 'oa-p3');

    const page1 = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}&limit=2`,
      undefined,
      ownerToken,
    );
    expect(page1.json().items).toHaveLength(2);
    const cursor = page1.json().nextCursor;
    expect(cursor).toBeTruthy();

    const page2 = await inject(
      'GET',
      `/api/v1/orders?restaurantId=${restaurantId}&limit=2&cursor=${cursor}`,
      undefined,
      ownerToken,
    );
    expect(page2.json().items).toHaveLength(1);
  });

  it('enriches order detail with customer + payment for staff, null for self', async () => {
    const order = await createOrder(aliceToken, 'PICKUP', 'oa-d1');
    // COD short-circuits to a PAID payment + CONFIRMED order.
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId: order.id, provider: 'cod', methodKind: 'COD' },
      aliceToken,
    );

    const staffView = await inject(
      'GET',
      `/api/v1/orders/${order.id}`,
      undefined,
      ownerToken,
    );
    expect(staffView.statusCode).toBe(200);
    expect(staffView.json().customer?.email).toBe('alice.e2e@test.local');
    expect(staffView.json().payment?.status).toBe('PAID');
    expect(Array.isArray(staffView.json().payment?.refunds)).toBe(true);

    const selfView = await inject(
      'GET',
      `/api/v1/orders/${order.id}`,
      undefined,
      aliceToken,
    );
    expect(selfView.statusCode).toBe(200);
    expect(selfView.json().customer ?? null).toBeNull();
    expect(selfView.json().payment ?? null).toBeNull();
  });
});
