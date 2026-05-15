import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('loyalty (e2e)', () => {
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
      email: 'loyal.e2e@test.local',
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

  it('lazily creates a zero/bronze account', async () => {
    const res = await inject('GET', '/api/v1/loyalty/me', undefined, userToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().points).toBe(0);
    expect(res.json().tier).toBe('bronze');
    expect(res.json().userId).toBe(userId);
  });

  it('returns the transaction ledger newest-first', async () => {
    const prisma = app.get(PrismaService);
    const account = await prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId, points: 50 },
      update: { points: 50 },
    });
    await prisma.loyaltyTransaction.createMany({
      data: [
        { accountId: account.id, delta: 30, reason: 'signup' },
        { accountId: account.id, delta: 20, reason: 'order' },
      ],
    });

    const res = await inject(
      'GET',
      '/api/v1/loyalty/me/history',
      undefined,
      userToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
    expect(res.json().items[0].reason).toBe('order');
  });

  it('requires auth', async () => {
    const res = await inject('GET', '/api/v1/loyalty/me');
    expect(res.statusCode).toBe(401);
  });
});
