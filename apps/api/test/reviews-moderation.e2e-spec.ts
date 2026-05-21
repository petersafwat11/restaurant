import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('reviews moderation status (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
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
    ownerToken = await ensureOwnerToken(app);

    await ensureRestaurant(app);

    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'mod-reviewer.e2e@test.local',
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

  async function makeReview(rating = 4, comment = 'Decent') {
    const prisma = app.get(PrismaService);
    const order = await prisma.order.create({
      data: {
        orderNumber: `MR-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        type: 'PICKUP',
        status: 'COMPLETED',
        subtotal: '20.00',
        taxTotal: '1.60',
        grandTotal: '21.60',
        currency: 'PLN',
      },
    });
    const res = await inject(
      'POST',
      '/api/v1/reviews',
      { orderId: order.id, rating, comment },
      userToken,
    );
    return res.json().id as string;
  }

  it('flags a review with a reason and excludes it from the public list', async () => {
    const id = await makeReview();

    const flagged = await inject(
      'PATCH',
      `/api/v1/admin/reviews/${id}`,
      { moderationStatus: 'FLAGGED', flagReason: 'spam suspect' },
      ownerToken,
    );
    expect(flagged.statusCode).toBe(200);
    expect(flagged.json().moderationStatus).toBe('FLAGGED');
    expect(flagged.json().flagReason).toBe('spam suspect');
    expect(flagged.json().isVisible).toBe(false);

    const publicList = await inject('GET', `/api/v1/reviews`);
    expect(publicList.json().items.some((r: { id: string }) => r.id === id)).toBe(false);
  });

  it('publishes a previously hidden review and clears any flag reason', async () => {
    const id = await makeReview();

    // First hide it.
    await inject(
      'PATCH',
      `/api/v1/admin/reviews/${id}`,
      { moderationStatus: 'FLAGGED', flagReason: 'needs review' },
      ownerToken,
    );

    const published = await inject(
      'PATCH',
      `/api/v1/admin/reviews/${id}`,
      { moderationStatus: 'PUBLISHED' },
      ownerToken,
    );
    expect(published.json().moderationStatus).toBe('PUBLISHED');
    expect(published.json().isVisible).toBe(true);
    expect(published.json().flagReason).toBeNull();
  });

  it('filters the admin list by moderationStatus', async () => {
    const pubId = await makeReview(5, 'Loved it');
    const order2 = await app.get(PrismaService).order.create({
      data: {
        orderNumber: `MR-2-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        type: 'PICKUP',
        status: 'COMPLETED',
        subtotal: '20.00',
        taxTotal: '1.60',
        grandTotal: '21.60',
        currency: 'PLN',
      },
    });
    const hidId = (
      await inject(
        'POST',
        '/api/v1/reviews',
        { orderId: order2.id, rating: 1, comment: 'meh' },
        userToken,
      )
    ).json().id;
    await inject(
      'PATCH',
      `/api/v1/admin/reviews/${hidId}`,
      { moderationStatus: 'HIDDEN' },
      ownerToken,
    );

    const hidden = await inject(
      'GET',
      '/api/v1/admin/reviews?moderationStatus=HIDDEN',
      undefined,
      ownerToken,
    );
    const hiddenIds = hidden.json().items.map((r: { id: string }) => r.id);
    expect(hiddenIds).toContain(hidId);
    expect(hiddenIds).not.toContain(pubId);

    const published = await inject(
      'GET',
      '/api/v1/admin/reviews?moderationStatus=PUBLISHED',
      undefined,
      ownerToken,
    );
    const publishedIds = published.json().items.map((r: { id: string }) => r.id);
    expect(publishedIds).toContain(pubId);
    expect(publishedIds).not.toContain(hidId);
  });
});
