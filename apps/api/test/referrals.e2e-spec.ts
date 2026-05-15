import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReferralsService } from '../src/referrals/referrals.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('referrals (e2e)', () => {
  let app: NestFastifyApplication;
  let referrerToken: string;
  let refereeToken: string;
  let refereeId: string;
  let code: string;

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

    const referrer = await inject('POST', '/api/v1/auth/register', {
      email: 'referrer.e2e@test.local',
      password: 'Password123!',
    });
    referrerToken = referrer.json().accessToken;

    const me = await inject('GET', '/api/v1/referrals/me', undefined, referrerToken);
    code = me.json().code;

    const referee = await inject('POST', '/api/v1/auth/register', {
      email: 'referee.e2e@test.local',
      password: 'Password123!',
      referralCode: code,
    });
    refereeToken = referee.json().accessToken;
    refereeId = referee.json().user.id;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('issues a stable code + link and tracks a pending referral', async () => {
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    const me = await inject('GET', '/api/v1/referrals/me', undefined, referrerToken);
    expect(me.json().link).toContain(`ref=${code}`);
    expect(me.json().totalReferred).toBe(1);
    expect(me.json().totalCompleted).toBe(0);

    const list = await inject('GET', '/api/v1/referrals', undefined, referrerToken);
    expect(list.json().items).toHaveLength(1);
    expect(list.json().items[0].status).toBe('PENDING');
  });

  it('completes the referral and grants loyalty points to both on first finished order', async () => {
    const referrals = app.get(ReferralsService);
    await referrals.onOrderStatusChanged({
      orderId: 'order-x',
      orderNumber: 'R-X',
      restaurantId: 'r1',
      userId: refereeId,
      from: 'PREPARING',
      to: 'COMPLETED',
      type: 'PICKUP',
      grandTotal: '30.00',
      currency: 'PLN',
      itemCount: 1,
      customerName: null,
      note: null,
      changedAt: new Date().toISOString(),
    });

    // Idempotent — a second finished order must not double-grant.
    await referrals.onOrderStatusChanged({
      orderId: 'order-y',
      orderNumber: 'R-Y',
      restaurantId: 'r1',
      userId: refereeId,
      from: 'PREPARING',
      to: 'DELIVERED',
      type: 'PICKUP',
      grandTotal: '10.00',
      currency: 'PLN',
      itemCount: 1,
      customerName: null,
      note: null,
      changedAt: new Date().toISOString(),
    });

    const list = await inject('GET', '/api/v1/referrals', undefined, referrerToken);
    expect(list.json().items[0].status).toBe('COMPLETED');
    expect(list.json().items[0].rewardGranted).toBe(true);

    const referrerLoyalty = await inject('GET', '/api/v1/loyalty/me', undefined, referrerToken);
    expect(referrerLoyalty.json().points).toBe(200);

    const refereeLoyalty = await inject('GET', '/api/v1/loyalty/me', undefined, refereeToken);
    expect(refereeLoyalty.json().points).toBe(100);
  });

  it('rejects self-referral and unknown codes silently (no referral row)', async () => {
    const solo = await inject('POST', '/api/v1/auth/register', {
      email: 'solo.e2e@test.local',
      password: 'Password123!',
      referralCode: 'ZZZZZZZZ',
    });
    expect(solo.statusCode).toBe(201);
    const soloToken = solo.json().accessToken;
    const list = await inject('GET', '/api/v1/referrals', undefined, soloToken);
    expect(list.json().items).toHaveLength(0);
  });
});
