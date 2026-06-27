import type { PaymentMethodKind } from '@repo/types';
import { toMinorUnits } from '@repo/utils/money';

/**
 * Map the customer's chosen method to Stripe `payment_method_types` so the
 * PaymentIntent offers exactly that method — not whatever
 * `automatic_payment_methods` would surface (plan §F3). Wallets (Apple/Google
 * Pay) ride on the `card` method and appear once the payment-method domain is
 * registered. Throws for COD (which never uses the Stripe provider).
 */
export function stripePaymentMethodTypes(methodKind: PaymentMethodKind): string[] {
  switch (methodKind) {
    case 'STRIPE_CARD':
    case 'APPLE_PAY':
    case 'GOOGLE_PAY':
    case 'WALLET':
      return ['card'];
    case 'BLIK':
      return ['blik'];
    case 'P24':
      return ['p24'];
    default:
      throw new Error(`Unsupported Stripe payment method kind: ${methodKind}`);
  }
}

/**
 * Deterministic Stripe idempotency key. Identical order + method + amount +
 * currency → identical key → Stripe returns the *same* PaymentIntent, so two
 * concurrent requests can't create duplicate intents for one order (plan §F2).
 * A method switch (card→BLIK) changes the key and yields a fresh,
 * method-correct intent — the caller cancels the previous one first.
 */
export function stripeIntentIdempotencyKey(input: {
  orderId: string;
  methodKind: PaymentMethodKind;
  amount: string;
  currency: string;
}): string {
  const minor = toMinorUnits(input.amount, input.currency);
  return `pi:${input.orderId}:${input.methodKind}:${minor}:${input.currency.toUpperCase()}`;
}
