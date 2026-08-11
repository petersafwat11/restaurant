import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb } from './setup-e2e';

describe('settings (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    ownerToken = await ensureOwnerToken(app);
    await ensureRestaurant(app);
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('GET /api/v1/admin/restaurant/settings returns restaurant settings', async () => {
    const res = await inject('GET', '/api/v1/admin/restaurant/settings', undefined, ownerToken);
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.taxRate).toBeDefined();
    expect(data.defaultDeliveryFee).toBeDefined();
    expect(data.minOrderAmount).toBeDefined();
    expect(data.deliveryRadiusKm).toBeDefined();
    expect(data.reservationSlotMinutes).toBeDefined();
    expect(data.reservationBufferMinutes).toBeDefined();
  });

  it('PATCH /api/v1/admin/restaurant/settings updates financials and reservation settings', async () => {
    const updateRes = await inject(
      'PATCH',
      '/api/v1/admin/restaurant/settings',
      {
        taxRate: '0.0825',
        defaultDeliveryFee: '7.50',
        minOrderAmount: '20.00',
        deliveryRadiusKm: 12,
        reservationSlotMinutes: 120,
        reservationBufferMinutes: 30,
      },
      ownerToken,
    );

    expect(updateRes.statusCode).toBe(200);
    const updated = updateRes.json();
    expect(updated.taxRate).toBe('0.0825');
    expect(updated.defaultDeliveryFee).toBe('7.50');
    expect(updated.minOrderAmount).toBe('20.00');
    expect(updated.deliveryRadiusKm).toBe(12);
    expect(updated.reservationSlotMinutes).toBe(120);
    expect(updated.reservationBufferMinutes).toBe(30);

    // Verify persistence in Prisma
    const prisma = app.get(PrismaService);
    const r = await prisma.restaurant.findFirst();
    expect(r?.taxRate.toString()).toBe('0.0825');
    expect(r?.defaultDeliveryFee.toFixed(2)).toBe('7.50');
    expect(r?.minOrderAmount.toFixed(2)).toBe('20.00');
    expect(r?.deliveryRadiusKm).toBe(12);
    expect(r?.reservationSlotMinutes).toBe(120);
    expect(r?.reservationBufferMinutes).toBe(30);

    // Verify subsequent GET returns updated values
    const getRes = await inject('GET', '/api/v1/admin/restaurant/settings', undefined, ownerToken);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().taxRate).toBe('0.0825');
    expect(getRes.json().minOrderAmount).toBe('20.00');
  });

  it('PATCH /api/v1/admin/restaurant/settings rejects invalid tax rates with 400 Bad Request', async () => {
    const invalidRes = await inject(
      'PATCH',
      '/api/v1/admin/restaurant/settings',
      { taxRate: '1.50' }, // > 1 (150%)
      ownerToken,
    );

    expect(invalidRes.statusCode).toBe(400);
  });
});
