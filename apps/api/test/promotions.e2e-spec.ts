import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('promotions (e2e)', () => {
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
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  async function makePromotion(extra: Record<string, unknown> = {}) {
    const promo = await inject(
      'POST',
      '/api/v1/promotions',
      {
        name: 'Test 10',
        type: 'PERCENT',
        value: '10',
        code: 'TEST10',
        ...extra,
      },
      ownerToken,
    );
    return promo.json();
  }

  it('rejects an expired promotion', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    await makePromotion({ endsAt: past, code: 'EXPIRED' });

    const res = await inject('POST', '/api/v1/coupons/validate', {
      code: 'EXPIRED',
      subtotal: '50.00',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valid).toBe(false);
    expect(res.json().reason).toBe('OUT_OF_WINDOW');
  });

  it('rejects unimplemented BOGO / FREE_DELIVERY coupons (no bogus flat discount)', async () => {
    await makePromotion({ name: 'BOGO', type: 'BOGO', value: '15', code: 'BOGOX' });
    const bogo = await inject('POST', '/api/v1/coupons/validate', {
      code: 'BOGOX',
      subtotal: '80.00',
    });
    expect(bogo.statusCode).toBe(200);
    expect(bogo.json().valid).toBe(false);
    expect(bogo.json().reason).toBe('PROMOTION_INACTIVE');

    await makePromotion({ name: 'FreeDel', type: 'FREE_DELIVERY', code: 'FREEDELX' });
    const fd = await inject('POST', '/api/v1/coupons/validate', {
      code: 'FREEDELX',
      subtotal: '80.00',
    });
    expect(fd.json().valid).toBe(false);
    expect(fd.json().reason).toBe('PROMOTION_INACTIVE');
  });

  it('rejects when minSubtotal is not met', async () => {
    await makePromotion({ minSubtotal: '100', code: 'MIN100' });

    const res = await inject('POST', '/api/v1/coupons/validate', {
      code: 'MIN100',
      subtotal: '50.00',
    });
    expect(res.json().valid).toBe(false);
    expect(res.json().reason).toBe('MIN_SUBTOTAL_NOT_MET');
  });

  it('rejects after per-user limit is reached', async () => {
    const promo = await makePromotion({ code: 'ONCE', perUserLimit: 1 });

    const me = await inject('GET', '/api/v1/auth/me', undefined, ownerToken);
    const userId = me.json().id as string;

    const prisma = app.get(PrismaService);
    await prisma.couponRedemption.create({
      data: { promotionId: promo.id, userId },
    });

    const res = await inject('POST', '/api/v1/coupons/validate', {
      code: 'ONCE',
      subtotal: '50.00',
      userId,
    });
    expect(res.json().valid).toBe(false);
    expect(res.json().reason).toBe('PER_USER_LIMIT_REACHED');
  });

  it('rejects after maxRedemptions is exhausted', async () => {
    const promo = await makePromotion({ code: 'MAX1', maxRedemptions: 1 });

    const prisma = app.get(PrismaService);
    await prisma.couponRedemption.create({
      data: { promotionId: promo.id },
    });

    const res = await inject('POST', '/api/v1/coupons/validate', {
      code: 'MAX1',
      subtotal: '50.00',
    });
    expect(res.json().valid).toBe(false);
    expect(res.json().reason).toBe('MAX_REDEMPTIONS_REACHED');
  });

  it('accepts a valid PERCENT coupon and returns the discount amount', async () => {
    await makePromotion({ value: '10', code: 'TENOFF' });

    const res = await inject('POST', '/api/v1/coupons/validate', {
      code: 'TENOFF',
      subtotal: '100.00',
    });
    expect(res.json().valid).toBe(true);
    expect(res.json().discountAmount).toBe('10.00');
  });

  it('deleting a promotion nulls out Cart.appliedPromotionId (SET NULL cascade)', async () => {
    const prisma = app.get(PrismaService);

    const promo = await makePromotion({ code: 'CASCADE1' });

    const cart = await prisma.cart.create({
      data: {
        sessionKey: `cascade-session-${Date.now()}`,
        appliedPromotionId: promo.id,
      },
    });
    expect(cart.appliedPromotionId).toBe(promo.id);

    const del = await inject(
      'DELETE',
      `/api/v1/promotions/${promo.id}`,
      undefined,
      ownerToken,
    );
    expect([200, 204]).toContain(del.statusCode);

    const after = await prisma.cart.findUniqueOrThrow({ where: { id: cart.id } });
    expect(after.appliedPromotionId).toBeNull();
  });
});
