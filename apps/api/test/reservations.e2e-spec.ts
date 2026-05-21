import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('reservations (e2e)', () => {
  let app: NestFastifyApplication;
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
    await ensureRestaurant(app);

    // Set up open hours every day 11:00-23:00 in UTC.
    const prisma = app.get(PrismaService);
    for (let day = 0; day < 7; day++) {
      await prisma.operatingHours.upsert({
        where: { dayOfWeek: day },
        update: { opensAt: '11:00', closesAt: '23:00', isClosed: false },
        create: { dayOfWeek: day, opensAt: '11:00', closesAt: '23:00', isClosed: false },
      });
    }
    await prisma.restaurant.updateMany({
      data: { timezone: 'UTC' },
    });
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('returns no availability when no tables exist', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await inject(
      'GET',
      `/api/v1/reservations/availability?date=${tomorrow}&partySize=2`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().slots).toEqual([]);
  });

  it('books a reservation when capacity allows', async () => {
    await inject(
      'POST',
      `/api/v1/tables`,
      { name: 'T1', capacity: 4 },
      ownerToken,
    );

    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    future.setUTCHours(18, 0, 0, 0);

    const res = await inject('POST', '/api/v1/reservations', {
      startAt: future.toISOString(),
      partySize: 2,
      contactName: 'Casey',
      contactPhone: '+48 600 111 222',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('confirmed');
    expect(res.json().tableId).toBeTruthy();
  });

  it('rejects second concurrent booking on same slot', async () => {
    await inject(
      'POST',
      `/api/v1/tables`,
      { name: 'T1', capacity: 4 },
      ownerToken,
    );

    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    future.setUTCHours(18, 0, 0, 0);

    const payload = {
      startAt: future.toISOString(),
      partySize: 2,
      contactName: 'A',
      contactPhone: '+48 600 000 001',
    };

    const [a, b] = await Promise.all([
      inject('POST', '/api/v1/reservations', payload),
      inject('POST', '/api/v1/reservations', payload),
    ]);

    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes[0]).toBe(201);
    expect(codes[1]).toBe(400);
  });

  it('admin can cancel a reservation', async () => {
    await inject(
      'POST',
      `/api/v1/tables`,
      { name: 'T1', capacity: 4 },
      ownerToken,
    );
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    future.setUTCHours(18, 0, 0, 0);
    const created = await inject('POST', '/api/v1/reservations', {
      startAt: future.toISOString(),
      partySize: 2,
      contactName: 'A',
      contactPhone: '+48 600 000 002',
    });
    const id = created.json().id;

    const cancelled = await inject(
      'POST',
      `/api/v1/reservations/${id}/cancel`,
      { reason: 'changed plans' },
      ownerToken,
    );
    expect(cancelled.statusCode).toBe(201);
    expect(cancelled.json().status).toBe('cancelled');
  });
});
