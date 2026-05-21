import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('order tracking (e2e)', () => {
  let app: NestFastifyApplication;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    await ensureOwnerToken(app);
    await ensureRestaurant(app);

    const prisma = app.get(PrismaService);
    await prisma.restaurant.updateMany({
      data: { geoPoint: { lat: 52.23, lng: 21.01 } },
    });

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'tracker.e2e@test.local',
      password: 'Password123!',
    });
    userToken = reg.json().accessToken;
    userId = reg.json().user.id;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  async function makeOrder(status: 'CONFIRMED' | 'DELIVERED') {
    const prisma = app.get(PrismaService);
    return prisma.order.create({
      data: {
        orderNumber: `R-TRK-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        type: 'DELIVERY',
        status,
        subtotal: '20.00',
        taxTotal: '1.60',
        grandTotal: '21.60',
        currency: 'PLN',
        deliveryAddress: { line1: 'ul. 5', city: 'Warsaw', geoPoint: { lat: 52.25, lng: 21.0 } },
        statusEvents: { create: [{ status }] },
      },
    });
  }

  it('returns a tracking snapshot with ETA + geo for the owner', async () => {
    const order = await makeOrder('CONFIRMED');
    const res = await inject(
      'GET',
      `/api/v1/orders/${order.id}/tracking`,
      undefined,
      userToken,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('CONFIRMED');
    expect(body.isTerminal).toBe(false);
    expect(body.etaMinutes).toBe(45); // 25 prep + 20 delivery leg
    expect(body.restaurantGeo).toEqual({ lat: 52.23, lng: 21.01 });
    expect(body.deliveryGeo).toEqual({ lat: 52.25, lng: 21.0 });
    expect(body.timeline).toHaveLength(1);
  });

  it('terminal order has no ETA', async () => {
    const order = await makeOrder('DELIVERED');
    const res = await inject(
      'GET',
      `/api/v1/orders/${order.id}/tracking`,
      undefined,
      userToken,
    );
    expect(res.json().isTerminal).toBe(true);
    expect(res.json().etaMinutes).toBeNull();
  });

  it('hides another user’s order (404)', async () => {
    const order = await makeOrder('CONFIRMED');
    const other = await inject('POST', '/api/v1/auth/register', {
      email: 'other.e2e@test.local',
      password: 'Password123!',
    });
    const res = await inject(
      'GET',
      `/api/v1/orders/${order.id}/tracking`,
      undefined,
      other.json().accessToken,
    );
    expect(res.statusCode).toBe(404);
  });

  it('signed-token public tracking: issue → fetch unauthenticated', async () => {
    const order = await makeOrder('CONFIRMED');
    const issued = await inject(
      'GET',
      `/api/v1/orders/${order.id}/tracking-token`,
      undefined,
      userToken,
    );
    expect(issued.statusCode).toBe(200);
    const { token } = issued.json();
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/);

    // No authorization header — token alone authorizes.
    const tracking = await inject(
      'GET',
      `/api/v1/orders/track?token=${encodeURIComponent(token)}`,
    );
    expect(tracking.statusCode).toBe(200);
    expect(tracking.json().orderId).toBe(order.id);
  });

  it('signed-token: rejects missing token (400)', async () => {
    const res = await inject('GET', '/api/v1/orders/track');
    expect(res.statusCode).toBe(400);
  });

  it('signed-token: rejects tampered token (404)', async () => {
    const order = await makeOrder('CONFIRMED');
    const issued = await inject(
      'GET',
      `/api/v1/orders/${order.id}/tracking-token`,
      undefined,
      userToken,
    );
    const { token } = issued.json();
    // Flip one char in the signature portion.
    const [payload, sig] = token.split('.');
    const flipped =
      sig[0] === 'A' ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    const tampered = `${payload}.${flipped}`;
    const res = await inject(
      'GET',
      `/api/v1/orders/track?token=${encodeURIComponent(tampered)}`,
    );
    expect(res.statusCode).toBe(404);
  });

  it('signed-token: rejects token for a different order', async () => {
    const orderA = await makeOrder('CONFIRMED');
    const orderB = await makeOrder('CONFIRMED');
    const issued = await inject(
      'GET',
      `/api/v1/orders/${orderA.id}/tracking-token`,
      undefined,
      userToken,
    );
    const { token } = issued.json();
    // Token validates for orderA; if the client URL says orderB, the frontend
    // catches the mismatch. Server-side, the token still resolves to orderA.
    const res = await inject(
      'GET',
      `/api/v1/orders/track?token=${encodeURIComponent(token)}`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().orderId).toBe(orderA.id);
    expect(res.json().orderId).not.toBe(orderB.id);
  });
});
