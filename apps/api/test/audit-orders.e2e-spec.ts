import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

/**
 * Sprint 6 wires `@AuditAction` onto the order/payment write surface. The
 * interceptor records asynchronously via the `audit.write` BullMQ queue, so
 * assertions poll the read endpoint until the row lands (≤ ~3s).
 */
describe('audit log on order writes (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let aliceToken: string;
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

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'audit-orders-e2e',
        name: 'Audit Orders E2E',
        phone: '+48 22 555 0010',
        email: 'auditord@e2e.local',
        address: { line1: 'ul. 10', city: 'Warsaw', country: 'PL' },
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

    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      aliceToken,
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

  async function waitForAudit(action: string): Promise<Array<Record<string, unknown>>> {
    for (let i = 0; i < 30; i++) {
      const res = await inject(
        'GET',
        `/api/v1/admin/audit-log?action=${encodeURIComponent(action)}`,
        undefined,
        ownerToken,
      );
      const items = (res.json().items ?? []) as Array<Record<string, unknown>>;
      if (items.length > 0) return items;
      await new Promise((r) => setTimeout(r, 100));
    }
    return [];
  }

  it('records order:create when an authed customer places an order', async () => {
    const created = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      aliceToken,
      { 'idempotency-key': 'audit-create-1' },
    );
    expect(created.statusCode).toBe(201);
    const orderId = created.json().id;

    const entries = await waitForAudit('order:create');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.resourceId === orderId)).toBe(true);
    expect(entries[0]?.resourceType).toBe('order');
  });

  it('records order:refund when a refund is issued', async () => {
    const created = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      aliceToken,
      { 'idempotency-key': 'audit-refund-1' },
    );
    const orderId = created.json().id;

    // COD short-circuits to a PAID payment.
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'cod', methodKind: 'COD' },
      aliceToken,
    );
    const payment = await inject(
      'GET',
      `/api/v1/payments/by-order/${orderId}`,
      undefined,
      ownerToken,
    );
    const paymentId = payment.json().id;

    const refund = await inject(
      'POST',
      `/api/v1/payments/${paymentId}/refunds`,
      { reason: 'audit test refund' },
      ownerToken,
    );
    expect(refund.statusCode).toBe(201);

    const entries = await waitForAudit('order:refund');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.resourceType).toBe('payment');
  });

  it('forbids audit-log reads without audit:read', async () => {
    const res = await inject('GET', '/api/v1/admin/audit-log', undefined, aliceToken);
    expect(res.statusCode).toBe(403);
  });
});
