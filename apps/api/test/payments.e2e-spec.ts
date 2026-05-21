import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, ensureRestaurant, resetDb, resetMenuDb } from './setup-e2e';

describe('payments (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let orderId: string;
  let paymentIntentRef: string;

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
    userToken = await register('payer.e2e@test.local');

    await ensureRestaurant(app);

    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      {
        slug: 'mains',
        name: 'Mains',
      },
      ownerToken,
    );
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId: cat.json().id,
        slug: 'burger',
        name: 'Burger',
        basePrice: '38.00',
      },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/cart/items`,
      { menuItemId: item.json().id, quantity: 2, modifierSelections: [] },
      userToken,
    );
    const order = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0' },
      userToken,
      { 'idempotency-key': 'pay-idem-1' },
    );
    orderId = order.json().id;
  });

  async function inject(
    method: string,
    url: string,
    body?: unknown,
    token?: string,
    extraHeaders: Record<string, string> = {},
  ) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
    });
  }

  async function register(email: string): Promise<string> {
    const res = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    return res.json().accessToken;
  }

  // ---- Create intent ----

  it('creates a Stripe intent and returns a clientSecret (stub mode)', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'STRIPE_CARD' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.provider).toBe('stripe');
    expect(body.clientSecret).toMatch(/_secret/);
    expect(body.confirmed).toBe(false);
    paymentIntentRef = body.paymentId;
    expect(paymentIntentRef).toBeTypeOf('string');
  });

  it('creates a P24 Stripe intent successfully', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'P24' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().clientSecret).toMatch(/_secret/);
  });

  it('creates a BLIK Stripe intent successfully', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'BLIK' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
  });

  it('COD short-circuits — order transitions to CONFIRMED immediately', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'cod', methodKind: 'COD' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().confirmed).toBe(true);

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('CONFIRMED');
  });

  // ---- Webhook ----

  it('processes Stripe payment_intent.succeeded webhook and confirms the order', async () => {
    // Create the intent so the Payment row exists.
    const intent = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'STRIPE_CARD' },
      userToken,
    );
    const providerRef = `pi_stub_${orderId}`;
    expect(intent.json().clientSecret).toContain(providerRef);

    const event = {
      id: 'evt_test_succeeded_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: providerRef } },
    };
    const res = await inject('POST', '/api/v1/payments/webhooks/stripe', event);
    expect(res.statusCode).toBe(200);

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('CONFIRMED');

    // Replay the same event id — should be idempotent.
    const replay = await inject('POST', '/api/v1/payments/webhooks/stripe', event);
    expect(replay.statusCode).toBe(200);

    // Order should still be CONFIRMED (not double-processed).
    const after = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(after.json().status).toBe('CONFIRMED');
  });

  // ---- Refund ----

  it('refunds a paid payment (full) and transitions order to REFUNDED', async () => {
    // Get to PAID via webhook simulation.
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'STRIPE_CARD' },
      userToken,
    );
    await inject('POST', '/api/v1/payments/webhooks/stripe', {
      id: 'evt_refund_setup_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: `pi_stub_${orderId}` } },
    });

    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    const refund = await inject(
      'POST',
      `/api/v1/payments/${payment.id}/refunds`,
      { reason: 'customer changed mind' },
      ownerToken,
    );
    expect(refund.statusCode).toBe(201);
    expect(refund.json().amount).toBe(payment.amount.toFixed(2));

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('REFUNDED');
  });

  it('refunds partially and leaves status as PARTIALLY_REFUNDED', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'STRIPE_CARD' },
      userToken,
    );
    await inject('POST', '/api/v1/payments/webhooks/stripe', {
      id: 'evt_partial_setup_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: `pi_stub_${orderId}` } },
    });

    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    const refund = await inject(
      'POST',
      `/api/v1/payments/${payment.id}/refunds`,
      { amount: '10.00', reason: 'goodwill' },
      ownerToken,
    );
    expect(refund.statusCode).toBe(201);

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe('PARTIALLY_REFUNDED');

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    // Webhook already moved order to CONFIRMED; a partial refund leaves it
    // there. Full refund is what transitions to REFUNDED.
    expect(order.json().status).toBe('CONFIRMED');
  });

  it('exposes the public config endpoint', async () => {
    const res = await inject('GET', '/api/v1/payments/config');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      currency: 'PLN',
      stripePublishableKey: expect.any(String),
    });
  });

  // ---- charge.refunded (dashboard sync) ----

  async function getOrderToPaid(): Promise<{ paymentId: string; intentRef: string }> {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'stripe', methodKind: 'STRIPE_CARD' },
      userToken,
    );
    const intentRef = `pi_stub_${orderId}`;
    await inject('POST', '/api/v1/payments/webhooks/stripe', {
      id: `evt_succeed_${Math.random().toString(36).slice(2)}`,
      type: 'payment_intent.succeeded',
      data: { object: { id: intentRef } },
    });
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    return { paymentId: payment.id, intentRef };
  }

  it('charge.refunded with unknown refund id creates Refund row and transitions order to REFUNDED', async () => {
    const { paymentId, intentRef } = await getOrderToPaid();
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const fullAmountMinor = Math.round(Number.parseFloat(payment.amount.toString()) * 100);

    const event = {
      id: 'evt_charge_refunded_full_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          payment_intent: intentRef,
          currency: payment.currency.toLowerCase(),
          amount_refunded: fullAmountMinor,
          refunds: {
            data: [
              {
                id: 're_dashboard_1',
                amount: fullAmountMinor,
                reason: 'requested_by_customer',
              },
            ],
          },
        },
      },
    };
    const res = await inject('POST', '/api/v1/payments/webhooks/stripe', event);
    expect(res.statusCode).toBe(200);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].providerRef).toBe('re_dashboard_1');

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('REFUNDED');
  });

  it('charge.refunded is idempotent across replay', async () => {
    const { paymentId, intentRef } = await getOrderToPaid();
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const fullAmountMinor = Math.round(Number.parseFloat(payment.amount.toString()) * 100);

    const event = {
      id: 'evt_charge_refunded_idem_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_2',
          payment_intent: intentRef,
          currency: payment.currency.toLowerCase(),
          amount_refunded: fullAmountMinor,
          refunds: {
            data: [{ id: 're_dashboard_idem_1', amount: fullAmountMinor }],
          },
        },
      },
    };
    await inject('POST', '/api/v1/payments/webhooks/stripe', event);
    // Replay: same event id → dedupe at WebhookEvent layer.
    await inject('POST', '/api/v1/payments/webhooks/stripe', event);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1);
  });

  it('charge.refunded whose refund id matches an existing Refund is a no-op', async () => {
    const { paymentId, intentRef } = await getOrderToPaid();
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    // Admin-initiated partial refund first — Stripe stub returns
    // `re_stub_<intent>` as providerRef.
    await inject(
      'POST',
      `/api/v1/payments/${paymentId}/refunds`,
      { amount: '10.00', reason: 'goodwill' },
      ownerToken,
    );
    const existing = await prisma.refund.findFirstOrThrow({ where: { paymentId } });
    expect(existing.providerRef).toBe(`re_stub_${intentRef}`);

    const event = {
      id: 'evt_charge_refunded_noop_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_3',
          payment_intent: intentRef,
          currency: payment.currency.toLowerCase(),
          amount_refunded: 1000,
          refunds: {
            data: [{ id: existing.providerRef, amount: 1000 }],
          },
        },
      },
    };
    const res = await inject('POST', '/api/v1/payments/webhooks/stripe', event);
    expect(res.statusCode).toBe(200);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1); // not duplicated
  });
});
