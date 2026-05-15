import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Prisma } from '@repo/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('analytics (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let restaurantId: string;
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
    const prisma = app.get(PrismaService);
    userId = await prisma.user.findFirstOrThrow({ where: { email: 'owner.e2e@test.local' } }).then((u) => u.id);

    const r = await inject('POST', '/api/v1/restaurants', {
      slug: 'analytics-e2e',
      name: 'Analytics E2E',
      phone: '+48 22 555 0003',
      email: 'a@e2e.local',
      address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
    }, ownerToken);
    restaurantId = r.json().id;

    // Seed 3 completed orders.
    for (let i = 0; i < 3; i++) {
      await prisma.order.create({
        data: {
          orderNumber: `R-AE-${i.toString().padStart(3, '0')}`,
          userId,
          restaurantId,
          type: 'DINE_IN',
          status: 'COMPLETED',
          subtotal: new Prisma.Decimal('100.00'),
          taxTotal: new Prisma.Decimal('8.00'),
          grandTotal: new Prisma.Decimal('108.00'),
          currency: 'PLN',
        },
      });
    }
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('returns overview KPIs', async () => {
    const res = await inject(
      'GET',
      `/api/v1/analytics/overview?restaurantId=${restaurantId}&period=today`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.revenue.value).toBe('324.00');
    expect(body.orders.value).toBe(3);
    expect(body.aov.value).toBe('108.00');
    expect(body.completionRate.value).toBe(1);
  });

  it('completion rate = completed/(completed+cancelled), ignoring in-flight/refunded', async () => {
    const prisma = app.get(PrismaService);
    // On top of the 3 COMPLETED from beforeEach: +1 CANCELLED, +1 PENDING.
    // Old (buggy) formula completed/total = 3/5 = 0.6.
    // Correct formula completed/(completed+cancelled) = 3/4 = 0.75.
    for (const [i, status] of (['CANCELLED', 'PENDING'] as const).entries()) {
      await prisma.order.create({
        data: {
          orderNumber: `R-AE-CR-${i}`,
          userId,
          restaurantId,
          type: 'DINE_IN',
          status,
          subtotal: new Prisma.Decimal('10.00'),
          taxTotal: new Prisma.Decimal('0.80'),
          grandTotal: new Prisma.Decimal('10.80'),
          currency: 'PLN',
        },
      });
    }
    const res = await inject(
      'GET',
      `/api/v1/analytics/overview?restaurantId=${restaurantId}&period=today`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().completionRate.value).toBe(0.75);
  });

  it('forbids non-admin', async () => {
    // Register a regular customer and try the endpoint.
    await inject('POST', '/api/v1/auth/register', {
      email: 'customer.analytics.e2e@test.local',
      password: 'Password123!',
    });
    const login = await inject('POST', '/api/v1/auth/login', {
      email: 'customer.analytics.e2e@test.local',
      password: 'Password123!',
    });
    const token = login.json().accessToken as string;
    const res = await inject(
      'GET',
      `/api/v1/analytics/overview?restaurantId=${restaurantId}&period=today`,
      undefined,
      token,
    );
    expect(res.statusCode).toBe(403);
  });

  it('returns orders-by-status', async () => {
    const res = await inject(
      'GET',
      `/api/v1/analytics/orders-by-status?restaurantId=${restaurantId}&period=today`,
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.find((s: { status: string; count: number }) => s.status === 'COMPLETED')?.count).toBe(3);
  });
});
