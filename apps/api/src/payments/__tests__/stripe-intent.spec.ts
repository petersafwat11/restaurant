import { describe, expect, it } from 'vitest';
import { stripeIntentIdempotencyKey, stripePaymentMethodTypes } from '../stripe-intent';

describe('stripePaymentMethodTypes (F3 method enforcement)', () => {
  it('maps card + wallets to the card method', () => {
    expect(stripePaymentMethodTypes('STRIPE_CARD')).toEqual(['card']);
    expect(stripePaymentMethodTypes('APPLE_PAY')).toEqual(['card']);
    expect(stripePaymentMethodTypes('GOOGLE_PAY')).toEqual(['card']);
    expect(stripePaymentMethodTypes('WALLET')).toEqual(['card']);
  });

  it('maps BLIK and P24 to their own single method', () => {
    expect(stripePaymentMethodTypes('BLIK')).toEqual(['blik']);
    expect(stripePaymentMethodTypes('P24')).toEqual(['p24']);
  });

  it('throws for COD (never uses the Stripe provider)', () => {
    expect(() => stripePaymentMethodTypes('COD')).toThrow();
  });
});

describe('stripeIntentIdempotencyKey (F2 duplicate-intent guard)', () => {
  const base = {
    orderId: 'order_1',
    methodKind: 'STRIPE_CARD' as const,
    amount: '82.08',
    currency: 'PLN',
  };

  it('is stable for identical inputs (same order+method+amount → reuse)', () => {
    expect(stripeIntentIdempotencyKey(base)).toBe(stripeIntentIdempotencyKey(base));
    expect(stripeIntentIdempotencyKey(base)).toBe('pi:order_1:STRIPE_CARD:8208:PLN');
  });

  it('changes on a method switch (new method-correct intent)', () => {
    expect(stripeIntentIdempotencyKey({ ...base, methodKind: 'BLIK' })).not.toBe(
      stripeIntentIdempotencyKey(base),
    );
  });

  it('changes when the amount or currency differs', () => {
    expect(stripeIntentIdempotencyKey({ ...base, amount: '82.09' })).not.toBe(
      stripeIntentIdempotencyKey(base),
    );
    expect(stripeIntentIdempotencyKey({ ...base, currency: 'EUR' })).not.toBe(
      stripeIntentIdempotencyKey(base),
    );
  });
});
