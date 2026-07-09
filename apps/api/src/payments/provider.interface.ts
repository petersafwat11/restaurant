import type { PaymentMethodKind, PaymentStatus } from '@repo/types';

export interface CreateIntentInput {
  orderId: string;
  amount: string; // 2dp string
  currency: string;
  methodKind: PaymentMethodKind;
  metadata?: Record<string, string>;
  /**
   * Deterministic idempotency key (plan §F2). Passed to the provider as a
   * request option so repeated/concurrent calls with the same key return the
   * same intent instead of creating duplicates.
   */
  idempotencyKey?: string;
}

export interface CreateIntentResult {
  /** Our unique transaction `reference` (eService) or COD short-circuit marker. Stored as Payment.providerRef. */
  providerRef: string;
  /** eService HPP link id (LNK_…) — stored as Payment.providerLinkId. undefined for COD. */
  linkId?: string;
  /** eService HPP redirect URL — send the browser here (cards/BLIK/3-DS). null for COD. */
  redirectUrl: string | null;
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

/**
 * Provider intent status normalized for reconciliation (plan §F6). `null` means
 * the provider couldn't determine it (stub mode / transient error) — the caller
 * leaves the local row untouched and retries on the next pass.
 */
export type NormalizedIntentStatus =
  | 'succeeded'
  | 'processing'
  | 'requires_action'
  | 'canceled'
  | 'failed'
  | 'unknown';

export interface ParsedWebhookRefund {
  /** Provider's refund id. */
  id: string;
  /** 2dp string. */
  amount: string;
  reason?: string | null;
}

export interface ParsedWebhookEvent {
  id: string;
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | string;
  /** Value to match against Payment.providerRef (eService: our unique transaction `reference`). */
  providerRef?: string;
  /** eService transaction id (TRN_…) — persisted as Payment.providerTxnId on capture/settle. */
  transactionId?: string;
  /** Refund events: list of refund objects. */
  refunds?: ParsedWebhookRefund[];
  /** Refund events: aggregate refunded amount in major units (2dp string). */
  amountRefunded?: string;
  raw: unknown;
}

/**
 * Provider-agnostic payment interface. Each provider implements its own
 * version; PaymentsService selects via `kind`.
 */
export interface PaymentProvider {
  /** Unique identifier (matches `Payment.provider` column). */
  readonly id: 'eservice' | 'cod';
  /** Supported PaymentMethodKinds. */
  readonly supports: ReadonlyArray<PaymentMethodKind>;

  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;

  /**
   * Cancel a still-open provider intent. Used when the customer switches
   * payment method (plan §F2/§F4) so the previous method-specific intent
   * doesn't linger. No-op / undefined for providers without cancelable intents
   * (COD).
   */
  cancelIntent?(providerRef: string): Promise<void>;

  /**
   * Fetch the current normalized status of a provider intent — used by the
   * reconciliation job (plan §F6) to repair local rows when a webhook was
   * missed. Returns null when it can't be determined (stub mode / error).
   */
  retrieveIntentStatus?(providerRef: string): Promise<NormalizedIntentStatus | null>;

  /**
   * Parse + verify a raw webhook delivery. Returns null when the signature is
   * invalid (caller responds 400). COD doesn't have webhooks.
   */
  parseWebhook?(rawBody: Buffer, signature: string | undefined): ParsedWebhookEvent | null;
}
