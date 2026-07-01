import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('notifications (e2e)', () => {
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
});
