import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('orders export (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let aliceToken: string;
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
    aliceToken = await register('alice.export.e2e@test.local');

    await ensureRestaurant(app);

    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      { slug: 'mains', name: 'Mains' },
      ownerToken,
    );
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      { categoryId: cat.json().id, slug: 'burger', name: 'Burger', basePrice: '38.00' },
      ownerToken,
    );
    itemId = item.json().id;

    await createOrder('PICKUP', 'oe-1');
    await createOrder('DINE_IN', 'oe-2');
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

  async function createOrder(type: 'PICKUP' | 'DINE_IN', idem: string) {
    await inject(
      'POST',
      `/api/v1/cart/items`,
      { menuItemId: itemId, quantity: 1, modifierSelections: [] },
      aliceToken,
    );
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { type, tipAmount: '0' },
      aliceToken,
      { 'idempotency-key': idem },
    );
    expect(res.statusCode).toBe(201);
  }

  it('downloads a CSV with all matching orders', async () => {
    const res = await inject(
      'GET',
      `/api/v1/orders/export?format=csv`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.+orders-/);
    const body = res.payload;
    // BOM + header row
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain('Order #,Customer,Items,Type,Status,Total,Placed');
    // Both seeded orders present
    expect(body.split('\r\n').filter(Boolean).length).toBeGreaterThanOrEqual(3); // header + 2 rows
  });

  it('downloads a PDF', async () => {
    const res = await inject(
      'GET',
      `/api/v1/orders/export?format=pdf`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/\.pdf"/);
    // PDF magic bytes
    expect(res.rawPayload.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('applies the type filter to the export', async () => {
    const res = await inject(
      'GET',
      `/api/v1/orders/export?type=DINE_IN&format=csv`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    const lines = res.payload.split('\r\n').filter(Boolean);
    // header + exactly one DINE_IN row
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Dine-in');
  });

  it('requires order:read — customer token gets 403', async () => {
    const res = await inject(
      'GET',
      `/api/v1/orders/export?format=csv`,
      undefined,
      aliceToken,
    );
    expect(res.statusCode).toBe(403);
  });
});
