import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { EserviceProvider } from '../src/payments/eservice.provider';
import { createTestApp, ensureOwnerToken, ensureRestaurant, orderLegal, resetDb, resetMenuDb } from './setup-e2e';

// These run against the eService provider in STUB mode (CI sets no
// ESERVICE_APP_ID), so:
//  - createIntent returns a deterministic HPP redirect URL and a
//    `ref_stub_<orderId>_<method>` reference,
//  - webhook bodies are accepted verbatim (stub mode skips signature
//    verification — the SHA512 signature check is covered in the
//    eservice.provider unit spec, which is the only place real mode runs).
describe('payments (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;
  let orderId: string;
  let itemId: string;
  let paymentIntentRef: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    itemId = item.json().id;
    await inject(
      'POST',
      `/api/v1/cart/items`,
      { menuItemId: itemId, quantity: 2, modifierSelections: [] },
      userToken,
    );
    const order = await inject(
      'POST',
      '/api/v1/orders',
      { type: 'PICKUP', tipAmount: '0', ...orderLegal() },
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

  // The deterministic stub reference for the current order + method.
  function stubRef(method: 'CARD' | 'BLIK'): string {
    return `ref_stub_${orderId}_${method}`;
  }

  // A CAPTURED status notification for a card payment. `trn`/`act` distinguish
  // deliveries so replay/out-of-order tests exercise the real guards (a shared
  // action id would dedupe at the WebhookEvent layer and prove nothing).
  function succeededEvent(opts: { trn: string; act: string; method?: 'CARD' | 'BLIK' }) {
    return {
      id: opts.trn,
      status: 'CAPTURED',
      reference: 'R-SANDBOX-ORDER',
      payment_method: { result: '00', message: 'AUTHORISED' },
      link_data: {
        id: `lnk_stub_${orderId}_${opts.method ?? 'CARD'}`,
        reference: stubRef(opts.method ?? 'CARD'),
      },
      action: { id: opts.act, type: 'STATUS_NOTIFICATION' },
    };
  }

  // ---- Create intent ----

  it('creates an eService intent and returns an HPP redirect URL (stub mode)', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.provider).toBe('eservice');
    expect(body.redirectUrl).toMatch(/^https:\/\/stub\.local\/hpp\//);
    expect(body.confirmed).toBe(false);
    paymentIntentRef = body.paymentId;
    expect(paymentIntentRef).toBeTypeOf('string');
  });

  it('creates a BLIK eService intent successfully', async () => {
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'BLIK' },
      userToken,
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().redirectUrl).toMatch(/^https:\/\/stub\.local\/hpp\//);
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
    // COD has no redirect.
    expect(res.json().redirectUrl).toBeNull();

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('CONFIRMED');
  });

  // ---- Signed HPP return ----

  it('rejects an unauthenticated return without changing payment state', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const provider = app.get(EserviceProvider);
    vi.spyOn(provider, 'verifyReturnNotification').mockReturnValue(false);

    const res = await inject(
      'GET',
      `/api/v1/payments/eservice/return?orderId=${orderId}&status=CAPTURED`,
    );
    expect(res.statusCode).toBe(400);

    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('PENDING');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(
      'PENDING',
    );
  });

  it('authenticates a return, confirms CAPTURED from the provider, and redirects', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const provider = app.get(EserviceProvider);
    vi.spyOn(provider, 'verifyReturnNotification').mockReturnValue(true);
    vi.spyOn(provider, 'retrieveTransaction').mockResolvedValue({
      id: 'TRN_return_captured',
      status: 'CAPTURED',
    });

    const res = await inject(
      'GET',
      `/api/v1/payments/eservice/return?orderId=${orderId}&status=PENDING`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(`/checkout/return?orderId=${orderId}`);

    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('PAID');
    expect(payment.providerTxnId).toBe('TRN_return_captured');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(
      'CONFIRMED',
    );
  });

  it('authenticates a return and synchronizes a provider decline before redirecting', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const provider = app.get(EserviceProvider);
    vi.spyOn(provider, 'verifyReturnNotification').mockReturnValue(true);
    vi.spyOn(provider, 'retrieveTransaction').mockResolvedValue({
      id: 'TRN_return_declined',
      status: 'DECLINED',
    });

    const res = await inject(
      'GET',
      `/api/v1/payments/eservice/return?orderId=${orderId}&status=PENDING`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('http://localhost:3000/checkout');
    expect(res.body).not.toContain('/checkout/return');

    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('FAILED');
    expect(payment.providerTxnId).toBe('TRN_return_declined');
  });

  // ---- Webhook ----

  it('processes an eService payment.succeeded webhook and confirms the order', async () => {
    // Create the intent so the Payment row exists.
    const intent = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    expect(intent.json().redirectUrl).toContain(orderId);

    const event = succeededEvent({ trn: 'TRN_succeeded_1', act: 'ACT_succeeded_1' });
    const res = await inject('POST', '/api/v1/payments/webhooks/eservice', event);
    expect(res.statusCode).toBe(200);

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('CONFIRMED');

    // The TRN id is persisted so refunds have a transaction to target.
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('PAID');
    expect(payment.providerTxnId).toBe('TRN_succeeded_1');

    // Replay the same action id — should be idempotent (dedupe at WebhookEvent).
    const replay = await inject('POST', '/api/v1/payments/webhooks/eservice', event);
    expect(replay.statusCode).toBe(200);
    const after = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(after.json().status).toBe('CONFIRMED');
  });

  it('a DECLINED notification marks the payment FAILED', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const res = await inject('POST', '/api/v1/payments/webhooks/eservice', {
      id: 'TRN_failed_1',
      status: 'DECLINED',
      reference: stubRef('CARD'),
      payment_method: { result: '05', message: 'DO_NOT_HONOUR' },
      action: { id: 'ACT_failed_1', type: 'STATUS_NOTIFICATION' },
    });
    expect(res.statusCode).toBe(200);
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('FAILED');
  });

  it('an out-of-order DECLINED after CAPTURED does not clobber PAID (§F6)', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    await inject(
      'POST',
      '/api/v1/payments/webhooks/eservice',
      succeededEvent({ trn: 'TRN_ooo_1', act: 'ACT_ooo_succeeded' }),
    );
    // A late failure for the same reference (distinct action id → actually
    // processed, not deduped) must be ignored.
    await inject('POST', '/api/v1/payments/webhooks/eservice', {
      id: 'TRN_ooo_1',
      status: 'DECLINED',
      reference: stubRef('CARD'),
      payment_method: { result: '05' },
      action: { id: 'ACT_ooo_failed', type: 'STATUS_NOTIFICATION' },
    });
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    expect(payment.status).toBe('PAID');
  });

  // ---- Refund ----

  it('refunds a paid payment (full) and transitions order to REFUNDED', async () => {
    // Get to PAID via webhook simulation (carries the TRN → providerTxnId).
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    await inject(
      'POST',
      '/api/v1/payments/webhooks/eservice',
      succeededEvent({ trn: 'TRN_refund_setup_1', act: 'ACT_refund_setup_1' }),
    );

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
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    await inject(
      'POST',
      '/api/v1/payments/webhooks/eservice',
      succeededEvent({ trn: 'TRN_partial_setup_1', act: 'ACT_partial_setup_1' }),
    );

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

  it('rejects a refund before the payment is captured (no providerTxnId yet)', async () => {
    // Force a PAID row with no TRN — e.g. a status flip that never carried a
    // transaction id. eService refunds have nothing to target, so 400.
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const prisma = app.get(PrismaService);
    await prisma.payment.update({
      where: { orderId },
      data: { status: 'PAID', providerTxnId: null },
    });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    const res = await inject(
      'POST',
      `/api/v1/payments/${payment.id}/refunds`,
      { reason: 'too soon' },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/captured/i);
  });

  it('exposes the public config endpoint', async () => {
    const res = await inject('GET', '/api/v1/payments/config');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      currency: 'PLN',
      // Stub mode → online payments disabled (COD only).
      onlinePaymentsEnabled: false,
    });
  });

  // ---- F1: guest authorization via signed order token ----

  async function createGuestOrder(sessionKey: string): Promise<{ id: string; token: string }> {
    await inject('POST', `/api/v1/cart/items?sessionKey=${sessionKey}`, {
      menuItemId: itemId,
      quantity: 1,
      modifierSelections: [],
    });
    const res = await inject(
      'POST',
      '/api/v1/orders',
      { sessionKey, type: 'PICKUP', tipAmount: '0', ...orderLegal({ guest: true }) },
      undefined,
      { 'idempotency-key': `guest-pay-${sessionKey}` },
    );
    expect(res.statusCode).toBe(201);
    return { id: res.json().id, token: res.json().trackingToken };
  }

  it('lets a guest create an intent with a valid X-Order-Token (no auth)', async () => {
    const guest = await createGuestOrder('pay-guest-ok');
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId: guest.id, provider: 'eservice', methodKind: 'CARD' },
      undefined,
      { 'x-order-token': guest.token },
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().redirectUrl).toMatch(/^https:\/\/stub\.local\/hpp\//);
  });

  it('rejects a guest intent with no token, an invalid token, or a wrong-order token', async () => {
    const guest = await createGuestOrder('pay-guest-reject');
    const other = await createGuestOrder('pay-guest-other');

    const noToken = await inject('POST', '/api/v1/payments/intent', {
      orderId: guest.id,
      provider: 'eservice',
      methodKind: 'CARD',
    });
    expect(noToken.statusCode).toBe(403);

    const badToken = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId: guest.id, provider: 'eservice', methodKind: 'CARD' },
      undefined,
      { 'x-order-token': 'not.a.valid.token' },
    );
    expect(badToken.statusCode).toBe(403);

    // A valid token for a *different* order must not authorize this one.
    const wrongOrder = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId: guest.id, provider: 'eservice', methodKind: 'CARD' },
      undefined,
      { 'x-order-token': other.token },
    );
    expect(wrongOrder.statusCode).toBe(403);
  });

  // ---- F2: reuse / method switch ----

  it('reuses one Payment row + the same redirect URL across duplicate same-method calls', async () => {
    const a = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const b = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    // Same order → same single Payment row (unique on orderId) and the reuse
    // short-circuit returns the identical HPP link (no new link minted).
    expect(a.json().paymentId).toBe(b.json().paymentId);
    expect(b.json().redirectUrl).toBe(a.json().redirectUrl);
    const prisma = app.get(PrismaService);
    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
  });

  it('switching method updates the single Payment row to the new method', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const prisma = app.get(PrismaService);
    // Model a provider transaction discovered for the first attempt. A new
    // method must not inherit this stale refund/reconciliation target.
    await prisma.payment.update({
      where: { orderId },
      data: { providerTxnId: 'TRN_previous_card_attempt' },
    });
    const blik = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'BLIK' },
      userToken,
    );
    expect(blik.statusCode).toBe(201);
    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].method).toBe('BLIK');
    expect(payments[0].providerRef).toContain('BLIK');
    expect(payments[0].providerTxnId).toBeNull();
  });

  it('rejects an intent for an already-paid order', async () => {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    await inject(
      'POST',
      '/api/v1/payments/webhooks/eservice',
      succeededEvent({ trn: 'TRN_already_paid_1', act: 'ACT_already_paid_1' }),
    );
    const res = await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/paid/i);
  });

  // ---- payment.refunded (dashboard sync) ----
  //
  // NOTE: the eService refund-notification field shape is unverified against a
  // live sample (see the TODO in eservice.provider.parseNotification). These
  // tests pin the *conservative* sync behaviour our parser implements today
  // (refunds[] with minor-unit amounts, matched by our `reference`). Revisit the
  // body shape once a live refund notification is captured.

  async function getOrderToPaid(trnSuffix: string): Promise<{ paymentId: string; trn: string }> {
    await inject(
      'POST',
      '/api/v1/payments/intent',
      { orderId, provider: 'eservice', methodKind: 'CARD' },
      userToken,
    );
    const trn = `TRN_paid_${trnSuffix}`;
    await inject(
      'POST',
      '/api/v1/payments/webhooks/eservice',
      succeededEvent({ trn, act: `ACT_paid_${trnSuffix}` }),
    );
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
    return { paymentId: payment.id, trn };
  }

  it('payment.refunded with unknown refund id creates a Refund row and transitions order to REFUNDED', async () => {
    const { paymentId } = await getOrderToPaid('rf1');
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const fullAmountMinor = Math.round(Number.parseFloat(payment.amount.toString()) * 100);

    const event = {
      id: 'TRN_refunded_full_1',
      status: 'REFUNDED',
      reference: stubRef('CARD'),
      currency: payment.currency,
      amount_refunded: String(fullAmountMinor),
      refunds: [
        { id: 're_dashboard_1', amount: String(fullAmountMinor), reason: 'requested_by_customer' },
      ],
      action: { id: 'ACT_refunded_full_1', type: 'STATUS_NOTIFICATION' },
    };
    const res = await inject('POST', '/api/v1/payments/webhooks/eservice', event);
    expect(res.statusCode).toBe(200);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].providerRef).toBe('re_dashboard_1');

    const order = await inject('GET', `/api/v1/orders/${orderId}`, undefined, userToken);
    expect(order.json().status).toBe('REFUNDED');
  });

  it('payment.refunded is idempotent across replay', async () => {
    const { paymentId } = await getOrderToPaid('rf2');
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const fullAmountMinor = Math.round(Number.parseFloat(payment.amount.toString()) * 100);

    const event = {
      id: 'TRN_refunded_idem_1',
      status: 'REFUNDED',
      reference: stubRef('CARD'),
      currency: payment.currency,
      amount_refunded: String(fullAmountMinor),
      refunds: [{ id: 're_dashboard_idem_1', amount: String(fullAmountMinor) }],
      action: { id: 'ACT_refunded_idem_1', type: 'STATUS_NOTIFICATION' },
    };
    await inject('POST', '/api/v1/payments/webhooks/eservice', event);
    // Replay: same action id → dedupe at WebhookEvent layer.
    await inject('POST', '/api/v1/payments/webhooks/eservice', event);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1);
  });

  it('payment.refunded whose refund id matches an existing Refund is a no-op', async () => {
    const { paymentId, trn } = await getOrderToPaid('rf3');
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    // Admin-initiated partial refund first — the eService stub returns
    // `re_stub_<TRN>` as the refund providerRef.
    await inject(
      'POST',
      `/api/v1/payments/${paymentId}/refunds`,
      { amount: '10.00', reason: 'goodwill' },
      ownerToken,
    );
    const existing = await prisma.refund.findFirstOrThrow({ where: { paymentId } });
    expect(existing.providerRef).toBe(`re_stub_${trn}`);

    const event = {
      id: 'TRN_refunded_noop_1',
      status: 'REFUNDED',
      reference: stubRef('CARD'),
      currency: payment.currency,
      amount_refunded: '1000',
      refunds: [{ id: existing.providerRef, amount: '1000' }],
      action: { id: 'ACT_refunded_noop_1', type: 'STATUS_NOTIFICATION' },
    };
    const res = await inject('POST', '/api/v1/payments/webhooks/eservice', event);
    expect(res.statusCode).toBe(200);

    const refunds = await prisma.refund.findMany({ where: { paymentId } });
    expect(refunds).toHaveLength(1); // not duplicated
  });
});
