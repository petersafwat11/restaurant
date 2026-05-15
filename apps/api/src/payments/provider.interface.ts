import type { PaymentMethodKind, PaymentStatus } from '@repo/types';

export interface CreateIntentInput {
  orderId: string;
  amount: string; // 2dp string
  currency: string;
  methodKind: PaymentMethodKind;
  metadata?: Record<string, string>;
}

export interface CreateIntentResult {
  /** Provider's payment-intent ID (or COD short-circuit marker). */
  providerRef: string;
  /** Stripe-only: PaymentIntent client_secret. null for COD. */
  clientSecret: string | null;
  /** True when no further client action is needed (COD short-circuit). */
  confirmed: boolean;
}

export interface RefundInput {
  providerRef: string;
  amount: string;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  amount: string;
  status: PaymentStatus;
}

export interface ParsedWebhookRefund {
  /** Provider's refund id (e.g., Stripe `re_...`). */
  id: string;
  /** 2dp string. */
  amount: string;
  reason?: string | null;
}

export interface ParsedWebhookEvent {
  id: string;
  type: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'charge.refunded' | string;
  paymentIntentId?: string;
  /** Refund-only: provider's charge id. */
  chargeId?: string;
  /** charge.refunded: list of refund objects on the charge. */
  refunds?: ParsedWebhookRefund[];
  /** charge.refunded: aggregate refunded amount in major units (2dp string). */
  amountRefunded?: string;
  raw: unknown;
}

/**
 * Provider-agnostic payment interface. Each provider implements its own
 * version; PaymentsService selects via `kind`.
 */
export interface PaymentProvider {
  /** Unique identifier (matches `Payment.provider` column). */
  readonly id: 'stripe' | 'cod';
  /** Supported PaymentMethodKinds. */
  readonly supports: ReadonlyArray<PaymentMethodKind>;

  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;

  /**
   * Parse + verify a raw webhook delivery. Returns null when the signature is
   * invalid (caller responds 400). COD doesn't have webhooks.
   */
  parseWebhook?(rawBody: Buffer, signature: string | undefined): ParsedWebhookEvent | null;
}
