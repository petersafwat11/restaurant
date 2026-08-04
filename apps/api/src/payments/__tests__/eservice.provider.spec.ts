// Must be first: seeds env vars before the provider's transitive `config/env.ts`
// import runs its load-time validation.
import './_env-setup';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ENV_TYPE } from '../../config/config.module';
import {
  EserviceProvider,
  buildHppPayload,
  makeHppReference,
} from '../eservice.provider';
import { computeEserviceSignature, verifyEserviceSignedParameters } from '../eservice-signature';

const APP_KEY = 'webhook_signing_key';

// Real-mode env (non-empty APP_ID → stubMode=false). We never invoke a network
// method here — only the pure parseWebhook path and the payload builder.
const realEnv = {
  ESERVICE_ENV: 'sandbox',
  ESERVICE_APP_ID: 'app_live',
  ESERVICE_APP_KEY: APP_KEY,
  ESERVICE_ACCOUNT_NAME: 'acct_live',
  ESERVICE_WEBHOOK_URL: 'https://api.example.test',
  ESERVICE_RETURN_URL: 'https://web.example.test/return',
  NODE_ENV: 'test',
} as unknown as ENV_TYPE;

const stubEnv = { ...realEnv, ESERVICE_APP_ID: '' } as unknown as ENV_TYPE;

function sign(raw: Buffer | string, appKey = APP_KEY): string {
  const buf = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : raw;
  return createHash('sha512').update(Buffer.concat([buf, Buffer.from(appKey, 'utf8')])).digest('hex');
}

describe('buildHppPayload (F5 minor units + unique reference)', () => {
  const base = {
    accountName: 'acct',
    orderReference: 'R-2026-000001',
    amount: '45.50',
    currency: 'PLN' as const,
    methodKind: 'CARD' as const,
    payer: { name: 'Ann', email: 'ann@test.local', language: 'pl' as const },
    returnUrl: 'https://web/return',
    statusUrl: 'https://api/webhooks/eservice',
    name: 'Order R-2026-000001',
    description: 'Payment for order R-2026-000001',
  };

  it('converts the amount to a minor-units string and sets HPP fields', () => {
    const payload = buildHppPayload({ ...base, reference: 'ref_1' }) as {
      type: string;
      reference: string;
      payer: {
        name: string;
        first_name: string;
        last_name: string;
        billing_address: { country: string };
      };
      order: {
        amount: string;
        currency: string;
        transaction_configuration: { allowed_payment_methods: string[]; capture_mode: string };
      };
      notifications: { return_url: string; status_url: string };
    };
    expect(payload.type).toBe('HOSTED_PAYMENT_PAGE');
    expect(payload.payer).toMatchObject({
      name: 'Ann',
      first_name: 'Ann',
      last_name: 'Ann',
      billing_address: { country: 'PL' },
    });
    expect(payload.order.amount).toBe('4550'); // 45.50 PLN → 4550 minor units, as a string
    expect(payload.order.currency).toBe('PLN');
    expect(payload.order.transaction_configuration.capture_mode).toBe('AUTO');
    expect(payload.order.transaction_configuration.allowed_payment_methods).toEqual(['CARD']);
    expect(payload.notifications.status_url).toBe(base.statusUrl);
  });

  it('sends the separate payer identity fields required by BLIK', () => {
    const payload = buildHppPayload({
      ...base,
      methodKind: 'BLIK',
      payer: { ...base.payer, name: 'Anna Maria Kowalska' },
      reference: 'ref_blik_payer',
    }) as {
      payer: {
        first_name: string;
        last_name: string;
        billing_address: { country: string };
      };
    };

    expect(payload.payer).toEqual(
      expect.objectContaining({
        first_name: 'Anna',
        last_name: 'Maria Kowalska',
        billing_address: { country: 'PL' },
      }),
    );
  });

  it('maps BLIK to the BLIK allowed method', () => {
    const payload = buildHppPayload({
      ...base,
      methodKind: 'BLIK',
      reference: 'ref_2',
    }) as {
      order: {
        transaction_configuration: { allowed_payment_methods: string[] };
        payment_method_configuration: {
          authentication: { preference: string };
          apm: { shipping_address_enabled: string; address_override: string };
          storage_mode: string;
        };
      };
    };
    expect(payload.order.transaction_configuration.allowed_payment_methods).toEqual(['BLIK']);
    expect(payload.order.payment_method_configuration).toEqual({
      authentication: { preference: 'NO_CHALLENGE_REQUESTED' },
      apm: { shipping_address_enabled: 'NO', address_override: 'NO' },
      storage_mode: 'OFF',
    });
  });

  it('keeps card-specific authentication and omits BLIK configuration', () => {
    const payload = buildHppPayload({ ...base, reference: 'ref_card' }) as {
      order: { payment_method_configuration: Record<string, unknown> };
    };
    expect(payload.order.payment_method_configuration).toEqual({
      authentication: { preference: 'CHALLENGE_PREFERRED' },
    });
  });

  it('carries whatever unique reference it is given (per-attempt uniqueness)', () => {
    const a = buildHppPayload({ ...base, reference: 'ref_a' }) as { reference: string };
    const b = buildHppPayload({ ...base, reference: 'ref_b' }) as { reference: string };
    expect(a.reference).toBe('ref_a');
    expect(b.reference).toBe('ref_b');
    expect(a.reference).not.toBe(b.reference);
  });
});

describe('makeHppReference (eService reference limit)', () => {
  it('produces a unique reference within eService’s 1–50 alphanumeric limit', () => {
    // eService rejects references > 50 chars (INVALID_REQUEST_DATA) and documents
    // the field as alphanumeric — assert both so the 67-char orderId_method_uuid
    // regression (which fails every real link creation) can never come back.
    const refs = Array.from({ length: 200 }, () => makeHppReference());
    for (const ref of refs) {
      expect(ref.length).toBeGreaterThanOrEqual(1);
      expect(ref.length).toBeLessThanOrEqual(50);
      expect(ref).toMatch(/^[a-zA-Z0-9]+$/);
    }
    expect(new Set(refs).size).toBe(refs.length); // all unique
  });
});

describe('EserviceProvider stub-mode createIntent', () => {
  it('returns a deterministic redirect URL + method-distinct reference', async () => {
    const provider = new EserviceProvider(stubEnv);
    expect(provider.stubMode).toBe(true);
    const card = await provider.createIntent({
      orderId: 'order_1',
      amount: '10.00',
      currency: 'PLN',
      methodKind: 'CARD',
    });
    expect(card.providerRef).toBe('ref_stub_order_1_CARD');
    expect(card.redirectUrl).toBe('https://stub.local/hpp/order_1_CARD');
    expect(card.linkId).toBe('lnk_stub_order_1_CARD');
    expect(card.confirmed).toBe(false);

    const blik = await provider.createIntent({
      orderId: 'order_1',
      amount: '10.00',
      currency: 'PLN',
      methodKind: 'BLIK',
    });
    // Method-distinct so the method-switch path is exercisable.
    expect(blik.providerRef).toBe('ref_stub_order_1_BLIK');
    expect(blik.providerRef).not.toBe(card.providerRef);
  });
});

describe('EserviceProvider.parseWebhook signature verification (real mode)', () => {
  const provider = new EserviceProvider(realEnv);

  const notification = {
    id: 'TRN_1',
    status: 'CAPTURED',
    amount: '4550',
    currency: 'PLN',
    reference: 'R-2026-000435',
    payment_method: { result: '00', message: 'AUTHORISED' },
    link_data: { id: 'LNK_1', reference: 'ref_order_1_CARD' },
    action: { id: 'ACT_1', type: 'STATUS_NOTIFICATION' },
  };

  it('accepts a body whose X-GP-Signature matches SHA512(raw + app_key)', () => {
    const raw = Buffer.from(JSON.stringify(notification), 'utf8');
    const event = provider.parseWebhook(raw, sign(raw));
    expect(event).not.toBeNull();
    expect(event?.type).toBe('payment.succeeded');
    expect(event?.providerRef).toBe('ref_order_1_CARD'); // live HPP match key = link_data.reference
    expect(event?.transactionId).toBe('TRN_1'); // TRN → providerTxnId
    expect(event?.id).toBe('ACT_1'); // idempotency = action id
  });

  it('rejects a body with a mismatched signature (returns null)', () => {
    const raw = Buffer.from(JSON.stringify(notification), 'utf8');
    const wrong = sign(raw, 'the_wrong_key');
    expect(provider.parseWebhook(raw, wrong)).toBeNull();
  });

  it('rejects when the raw body is tampered after signing', () => {
    const raw = Buffer.from(JSON.stringify(notification), 'utf8');
    const goodSig = sign(raw);
    const tampered = Buffer.from(JSON.stringify({ ...notification, amount: '1' }), 'utf8');
    // Signature was for the original bytes → verifying the tampered bytes fails.
    expect(provider.parseWebhook(tampered, goodSig)).toBeNull();
  });

  it('rejects a missing signature and a malformed hex signature', () => {
    const raw = Buffer.from(JSON.stringify(notification), 'utf8');
    expect(provider.parseWebhook(raw, undefined)).toBeNull();
    // Wrong length hex → timingSafeEqual guard returns false rather than throwing.
    expect(provider.parseWebhook(raw, 'abcd')).toBeNull();
  });

  it('classifies a DECLINED notification as payment.failed', () => {
    const declined = { ...notification, status: 'DECLINED', payment_method: { result: '05' } };
    const raw = Buffer.from(JSON.stringify(declined), 'utf8');
    const event = provider.parseWebhook(raw, sign(raw));
    expect(event?.type).toBe('payment.failed');
  });

  it('falls back to the top-level reference when link_data.reference is absent', () => {
    const fallback = { ...notification, reference: 'legacy_ref', link_data: { id: 'LNK_1' } };
    const raw = Buffer.from(JSON.stringify(fallback), 'utf8');
    expect(provider.parseWebhook(raw, sign(raw))?.providerRef).toBe('legacy_ref');
  });
});

describe('eService return_url signature verification (real mode)', () => {
  const provider = new EserviceProvider(realEnv);
  const signedParameters =
    'id=TRN_1&status=PENDING&reference=ref_1&payment_method.result=01&action.type=RETURN_NOTIFICATION';
  const signature = computeEserviceSignature(signedParameters, APP_KEY);

  it('accepts a GET signature without re-encoding or reordering its query', () => {
    const rawUrl =
      `/api/v1/payments/eservice/return?orderId=order_1&X-GP-Signature=${signature}&` +
      signedParameters;
    expect(
      provider.verifyReturnNotification({
        method: 'GET',
        rawUrl,
        rawBody: Buffer.alloc(0),
      }),
    ).toBe(true);
  });

  it('accepts a form POST whose signature is the first signed form field', () => {
    const rawBody = Buffer.from(`X-GP-Signature=${signature}&${signedParameters}`, 'utf8');
    expect(
      provider.verifyReturnNotification({
        method: 'POST',
        rawUrl: '/api/v1/payments/eservice/return?orderId=order_1',
        rawBody,
      }),
    ).toBe(true);
  });

  it('accepts a header-signed POST over the exact body', () => {
    const rawBody = Buffer.from(JSON.stringify({ id: 'TRN_1', status: 'CAPTURED' }), 'utf8');
    expect(
      provider.verifyReturnNotification({
        method: 'POST',
        rawUrl: '/api/v1/payments/eservice/return?orderId=order_1',
        rawBody,
        headerSignature: computeEserviceSignature(rawBody, APP_KEY),
      }),
    ).toBe(true);
  });

  it('rejects missing, reordered, tampered, and malformed signed parameters', () => {
    const good = `X-GP-Signature=${signature}&${signedParameters}`;
    expect(verifyEserviceSignedParameters(good, APP_KEY).valid).toBe(true);
    expect(verifyEserviceSignedParameters(signedParameters, APP_KEY).valid).toBe(false);
    expect(
      verifyEserviceSignedParameters(good.replace('status=PENDING', 'status=CAPTURED'), APP_KEY)
        .valid,
    ).toBe(false);
    expect(verifyEserviceSignedParameters('X-GP-Signature=abcd&id=TRN_1', APP_KEY).valid).toBe(
      false,
    );
  });
});

describe('EserviceProvider.parseWebhook stub mode (no signature)', () => {
  it('accepts an unsigned JSON body verbatim', () => {
    const provider = new EserviceProvider(stubEnv);
    const raw = Buffer.from(
      JSON.stringify({
        id: 'TRN_x',
        status: 'CAPTURED',
        reference: 'ref_stub_order_1_CARD',
        payment_method: { result: '00' },
        action: { id: 'ACT_x' },
      }),
      'utf8',
    );
    const event = provider.parseWebhook(raw, undefined);
    expect(event?.type).toBe('payment.succeeded');
    expect(event?.providerRef).toBe('ref_stub_order_1_CARD');
  });
});
