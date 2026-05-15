import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('reviews (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let userId: string;
  let restaurantId: string;

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
        slug: 'reviews-e2e',
        name: 'Reviews E2E',
        phone: '+48 22 555 0009',
        email: 'rev@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
      },
      ownerToken,
    );
    restaurantId = r.json().id;

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'reviewer.e2e@test.local',
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

  async function makeOrder(status: 'COMPLETED' | 'PENDING') {
    const prisma = app.get(PrismaService);
    return prisma.order.create({
      data: {
        orderNumber: `R-TEST-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        restaurantId,
        type: 'PICKUP',
        status,
        subtotal: '20.00',
        taxTotal: '1.60',
        grandTotal: '21.60',
        currency: 'PLN',
      },
    });
  }

  it('lets a customer review only their own completed order, once', async () => {
    const order = await makeOrder('COMPLETED');

    const ok = await inject(
      'POST',
      '/api/v1/reviews',
      { orderId: order.id, rating: 5, comment: 'Great!' },
      userToken,
    );
    expect(ok.statusCode).toBe(201);
    expect(ok.json().rating).toBe(5);

    const dup = await inject(
      'POST',
      '/api/v1/reviews',
      { orderId: order.id, rating: 3 },
      userToken,
    );
    expect(dup.statusCode).toBe(400);

    const pending = await makeOrder('PENDING');
    const tooEarly = await inject(
      'POST',
      '/api/v1/reviews',
      { orderId: pending.id, rating: 4 },
      userToken,
    );
    expect(tooEarly.statusCode).toBe(400);
  });

  it('attaches uploaded image keys to the review', async () => {
    const order = await makeOrder('COMPLETED');
    const res = await inject(
      'POST',
      '/api/v1/reviews',
      {
        orderId: order.id,
        rating: 4,
        comment: 'Photo proof',
        imageKeys: ['reviews/a.jpg', 'reviews/b.jpg'],
      },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.images).toHaveLength(2);
    expect(body.images[0].url).toContain('reviews/a.jpg');

    const list = await inject(
      'GET',
      `/api/v1/restaurants/${restaurantId}/reviews`,
    );
    expect(list.json().items[0].images).toHaveLength(2);
  });

  it('auto-hides a review with 2+ URLs and admin can toggle visibility', async () => {
    const order = await makeOrder('COMPLETED');
    const res = await inject(
      'POST',
      '/api/v1/reviews',
      {
        orderId: order.id,
        rating: 1,
        comment: 'spam http://a.com and http://b.com buy now',
      },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    const id = res.json().id;

    const publicList = await inject(
      'GET',
      `/api/v1/restaurants/${restaurantId}/reviews`,
    );
    expect(publicList.json().items.find((x: { id: string }) => x.id === id)).toBeUndefined();

    const mod = await inject(
      'PATCH',
      `/api/v1/admin/reviews/${id}`,
      { isVisible: true },
      ownerToken,
    );
    expect(mod.statusCode).toBe(200);
    expect(mod.json().isVisible).toBe(true);
  });
});
