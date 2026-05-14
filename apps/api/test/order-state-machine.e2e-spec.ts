import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('order state machine (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let customerToken: string;
  let restaurantId: string;
  let orderId: string;

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
    customerToken = await register('sm.customer.e2e@test.local');

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'sm-e2e',
        name: 'State Machine E2E',
        phone: '+48 22 555 0001',
        email: 'sm@e2e.local',
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
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId: cat.json().id,
        slug: 'burger',
        name: 'Burger',
        basePrice: '38.00',
      },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: item.json().id, quantity: 1, modifierSelections: [] },
      customerToken,
    );
    const order = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      customerToken,
      { 'idempotency-key': 'sm-idem-1' },
    );
    orderId = order.json().id;

    // Confirm via direct DB update (simulates payment webhook).
    const prisma = app.get(PrismaService);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });
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

  it('owner can walk a pickup order through the full happy path', async () => {
    const r1 = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'PREPARING' },
      ownerToken,
    );
    expect(r1.statusCode).toBe(201);
    expect(r1.json().status).toBe('PREPARING');

    const r2 = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'READY' },
      ownerToken,
    );
    expect(r2.statusCode).toBe(201);
    expect(r2.json().status).toBe('READY');

    const r3 = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'COMPLETED' },
      ownerToken,
    );
    expect(r3.statusCode).toBe(201);
    expect(r3.json().status).toBe('COMPLETED');
  });

  it('customer cannot move order from CONFIRMED to anywhere', async () => {
    const res = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'CANCELLED' },
      customerToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects PREPARING → CANCELLED (post-payment cancellation must go through refund)', async () => {
    await inject('POST', `/api/v1/orders/${orderId}/status`, { to: 'PREPARING' }, ownerToken);
    const res = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'CANCELLED' },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('appends an OrderStatusEvent per transition', async () => {
    await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'PREPARING', note: 'starting prep' },
      ownerToken,
    );
    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, customerToken);
    const events = order.json().statusEvents as { status: string; note: string | null }[];
    expect(events.length).toBeGreaterThanOrEqual(2);
    const last = events[events.length - 1];
    expect(last.status).toBe('PREPARING');
    expect(last.note).toBe('starting prep');
  });
});
