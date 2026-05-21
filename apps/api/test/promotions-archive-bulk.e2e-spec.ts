import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('promotions archive + bulk coupons (e2e)', () => {
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

  async function makePromotion() {
    const res = await inject(
      'POST',
      '/api/v1/promotions',
      { name: 'Archive Test', type: 'PERCENT', value: '15' },
      ownerToken,
    );
    return res.json().id as string;
  }

  it('archives a promotion, hides it from the default list, and surfaces it with includeArchived=true', async () => {
    const id = await makePromotion();

    const archived = await inject(
      'POST',
      `/api/v1/promotions/${id}/archive`,
      undefined,
      ownerToken,
    );
    expect(archived.statusCode).toBe(200);
    expect(archived.json().isArchived).toBe(true);
    expect(archived.json().archivedAt).toBeTruthy();
    expect(archived.json().isActive).toBe(false);

    const defaultList = await inject('GET', '/api/v1/promotions', undefined, ownerToken);
    expect(defaultList.json().some((p: { id: string }) => p.id === id)).toBe(false);

    const withArchived = await inject(
      'GET',
      '/api/v1/promotions?includeArchived=true',
      undefined,
      ownerToken,
    );
    expect(withArchived.json().some((p: { id: string }) => p.id === id)).toBe(true);
  });

  it('unarchives a promotion and brings it back to the default list', async () => {
    const id = await makePromotion();
    await inject('POST', `/api/v1/promotions/${id}/archive`, undefined, ownerToken);

    const restored = await inject(
      'POST',
      `/api/v1/promotions/${id}/unarchive`,
      undefined,
      ownerToken,
    );
    expect(restored.statusCode).toBe(200);
    expect(restored.json().isArchived).toBe(false);
    expect(restored.json().archivedAt).toBeNull();

    const list = await inject('GET', '/api/v1/promotions', undefined, ownerToken);
    expect(list.json().some((p: { id: string }) => p.id === id)).toBe(true);
  });

  it('bulk-generates unique coupon codes with a prefix', async () => {
    const id = await makePromotion();

    const res = await inject(
      'POST',
      `/api/v1/promotions/${id}/coupons/bulk`,
      { quantity: 25, prefix: 'BULK', codeLength: 8, maxRedemptions: 1 },
      ownerToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.created).toBe(25);
    expect(body.coupons).toHaveLength(25);

    const codes = body.coupons.map((c: { code: string }) => c.code);
    for (const code of codes) {
      expect(code.startsWith('BULK')).toBe(true);
      expect(code.length).toBe(8 + 4); // codeLength + prefix
    }
    expect(new Set(codes).size).toBe(25); // all unique

    // All coupons land in the listCoupons query.
    const list = await inject(
      'GET',
      `/api/v1/promotions/${id}/coupons`,
      undefined,
      ownerToken,
    );
    expect(list.json().length).toBeGreaterThanOrEqual(25);
  });

  it('rejects bulk generation that exceeds the quantity bound', async () => {
    const id = await makePromotion();
    const res = await inject(
      'POST',
      `/api/v1/promotions/${id}/coupons/bulk`,
      { quantity: 5000 },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });
});
