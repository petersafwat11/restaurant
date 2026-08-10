import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { OrderCreatedEvent } from '@repo/types';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StaffOrderAlertService } from '../src/notifications/staff-order-alert.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('notifications (e2e)', () => {
  let app: NestFastifyApplication;
  let userToken: string;
  let userId: string;
  let ownerToken: string;

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
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'notif.e2e@test.local',
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

  it('lists feed, counts unread, and marks read', async () => {
    const prisma = app.get(PrismaService);
    await prisma.notification.createMany({
      data: [
        { userId, type: 'system', title: 'A', body: 'a' },
        { userId, type: 'promo', title: 'B', body: 'b' },
      ],
    });

    const list = await inject('GET', '/api/v1/notifications', undefined, userToken);
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(2);
    expect(list.json().unreadCount).toBe(2);

    const firstId = list.json().items[0].id;
    const read = await inject(
      'POST',
      `/api/v1/notifications/${firstId}/read`,
      undefined,
      userToken,
    );
    expect(read.statusCode).toBe(200);

    const count = await inject(
      'GET',
      '/api/v1/notifications/unread-count',
      undefined,
      userToken,
    );
    expect(count.json().unreadCount).toBe(1);

    const all = await inject(
      'POST',
      '/api/v1/notifications/read-all',
      undefined,
      userToken,
    );
    expect(all.json().count).toBe(1);
  });

  it('reads defaults and patches preferences', async () => {
    const def = await inject(
      'GET',
      '/api/v1/notifications/preferences',
      undefined,
      userToken,
    );
    expect(def.json().promotionsPush).toBe(false);
    expect(def.json().orderUpdatesPush).toBe(true);

    const patched = await inject(
      'PATCH',
      '/api/v1/notifications/preferences',
      { promotionsPush: true, orderUpdatesSms: false },
      userToken,
    );
    expect(patched.json().promotionsPush).toBe(true);
    expect(patched.json().orderUpdatesSms).toBe(false);
    // Untouched field preserved.
    expect(patched.json().orderUpdatesPush).toBe(true);
  });

  it('requires auth', async () => {
    const res = await inject('GET', '/api/v1/notifications');
    expect(res.statusCode).toBe(401);
  });

  it('registers and removes an owner Web Push subscription', async () => {
    const prisma = app.get(PrismaService);
    const subscription = {
      endpoint: 'https://push.example.test/subscription/owner-device',
      expirationTime: null,
      keys: { p256dh: 'public-encryption-key', auth: 'auth-secret' },
      userAgent: 'Vitest browser',
    };

    const forbidden = await inject(
      'POST',
      '/api/v1/notifications/web-push',
      subscription,
      userToken,
    );
    expect(forbidden.statusCode).toBe(403);

    const subscribed = await inject(
      'POST',
      '/api/v1/notifications/web-push',
      subscription,
      ownerToken,
    );
    expect(subscribed.statusCode).toBe(200);
    expect(subscribed.json()).toEqual({ success: true });

    const stored = await prisma.webPushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
      include: { user: { select: { email: true } } },
    });
    expect(stored?.user.email).toBe('owner.e2e@test.local');
    expect(stored?.p256dh).toBe(subscription.keys.p256dh);

    const unsubscribed = await inject(
      'POST',
      '/api/v1/notifications/web-push/unsubscribe',
      { endpoint: subscription.endpoint },
      ownerToken,
    );
    expect(unsubscribed.statusCode).toBe(200);
    expect(await prisma.webPushSubscription.count()).toBe(0);
  });

  it('creates an order-linked in-app notification for authorized staff', async () => {
    const event: OrderCreatedEvent = {
      orderId: 'order-notification-e2e',
      orderNumber: 'R-2026-000099',
      userId: null,
      status: 'PENDING',
      type: 'PICKUP',
      grandTotal: '32.50',
      currency: 'PLN',
      itemCount: 2,
      customerName: 'Ada',
      createdAt: new Date().toISOString(),
    };

    await app.get(StaffOrderAlertService).onOrderCreated(event);

    const list = await inject('GET', '/api/v1/notifications', undefined, ownerToken);
    expect(list.statusCode).toBe(200);
    expect(list.json().unreadCount).toBe(1);
    expect(list.json().items[0]).toEqual(
      expect.objectContaining({
        type: 'new_order',
        title: expect.stringContaining(event.orderNumber),
        data: expect.objectContaining({ orderId: event.orderId }),
        readAt: null,
      }),
    );
  });
});
