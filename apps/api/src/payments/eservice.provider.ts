import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PaymentMethodKind, PaymentStatus } from '@repo/types';
import { fromMinorUnits, toMinorUnits } from '@repo/utils/money';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { EserviceClient } from './eservice-client';
import {
  verifyEservicePostSignature,
  verifyEserviceSignedParameters,
} from './eservice-signature';
import { classifyWebhookType, mapTransactionStatus } from './eservice-status';
import type {
  CreateIntentInput,
  CreateIntentResult,
  NormalizedIntentStatus,
  ParsedWebhookEvent,
  ParsedWebhookRefund,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from './provider.interface';

// eService only ever receives one method per HPP link — exactly the method the
// customer chose (never a menu of methods).
function allowedPaymentMethods(methodKind: PaymentMethodKind): Array<'CARD' | 'BLIK'> {
  switch (methodKind) {
    case 'CARD':
      return ['CARD'];
    case 'BLIK':
      return ['BLIK'];
    default:
      throw new Error(`Unsupported eService payment method kind: ${methodKind}`);
  }
}

/**
 * Generate a unique HPP link `reference` (our webhook / reconcile match key).
 * eService caps `reference` at 50 alphanumeric chars and rejects longer values
 * with `INVALID_REQUEST_DATA` — so this is a compact 32-char hex token, NOT the
 * 67-char `orderId_method_uuid` form. Order correlation is preserved separately
 * via `order.reference` (= orderNumber) in the HPP payload.
 */
export function makeHppReference(): string {
  return randomUUID().replace(/-/g, '');
}

export interface BuildHppPayloadInput {
  accountName: string;
  /** Unique per attempt — becomes both the link `reference` and our match key. */
  reference: string;
  orderReference: string;
  amount: string; // 2dp major-units
  currency: string;
  methodKind: PaymentMethodKind;
  payer: { name: string; email: string; language: 'pl' | 'en' };
  returnUrl: string;
  statusUrl: string;
  name: string;
  description: string;
}

export interface EserviceReturnVerificationInput {
  method: string;
  rawUrl: string;
  rawBody: Buffer;
  headerSignature?: string;
}

function splitPayerName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Customer', lastName: 'Customer' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

/**
 * Build the `POST /ucp/links` request body for a Hosted Payment Page link. Pure
 * + exported so the unit tests can assert the minor-units conversion and the
 * per-attempt unique `reference` without any network / Nest boot.
 */
export function buildHppPayload(input: BuildHppPayloadInput): Record<string, unknown> {
  const isBlik = input.methodKind === 'BLIK';
  const { firstName, lastName } = splitPayerName(input.payer.name);

  return {
    account_name: input.accountName,
    type: 'HOSTED_PAYMENT_PAGE',
    name: input.name,
    description: input.description,
    reference: input.reference,
    payer: {
      name: input.payer.name,
      first_name: firstName,
      last_name: lastName,
      language: input.payer.language,
      email: input.payer.email,
      billing_address: {
        country: 'PL',
      },
    },
    order: {
      amount: String(toMinorUnits(input.amount, input.currency)),
      currency: input.currency,
      reference: input.orderReference,
      transaction_configuration: {
        channel: 'CNP',
        country: 'PL',
        capture_mode: 'AUTO',
        allowed_payment_methods: allowedPaymentMethods(input.methodKind),
      },
      payment_method_configuration: {
        authentication: {
          preference: isBlik ? 'NO_CHALLENGE_REQUESTED' : 'CHALLENGE_PREFERRED',
        },
        ...(isBlik
          ? {
              apm: {
                shipping_address_enabled: 'NO',
                address_override: 'NO',
              },
              storage_mode: 'OFF',
            }
          : {}),
      },
    },
    notifications: {
      return_url: input.returnUrl,
      status_url: input.statusUrl,
    },
  };
}

interface CreateLinkResponse {
  id: string;
  url: string;
  status?: string;
  expiration_date?: string;
}

interface TransactionsResponse {
  transactions?: Array<{
    id?: string;
    reference?: string;
    status?: string;
    payment_method?: { result?: string };
  }>;
}

@Injectable()
export class EserviceProvider implements PaymentProvider {
  readonly id = 'eservice' as const;
  readonly supports: ReadonlyArray<PaymentMethodKind> = ['CARD', 'BLIK'];

  private readonly logger = new Logger(EserviceProvider.name);
  private readonly client: EserviceClient | null;
  private readonly appKey: string;
  readonly stubMode: boolean;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    // Empty app id → stub mode (deterministic fakes), so the redirect flow can be
    // exercised in dev / e2e with no eService credentials.
    this.stubMode = !env.ESERVICE_APP_ID;
    this.appKey = env.ESERVICE_APP_KEY;

    if (this.stubMode) {
      this.logger.warn('ESERVICE_APP_ID not configured — eService provider running in stub mode');
      this.client = null;
    } else {
      this.client = new EserviceClient(env);
    }
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    if (this.stubMode || !this.client) {
      // Deterministic stub so the frontend can exercise the full redirect flow
      // in dev and the e2e/reuse/method-switch logic stays reproducible. The
      // reference is method-distinct so the method-switch path is exercisable.
      const providerRef = `ref_stub_${input.orderId}_${input.methodKind}`;
      return {
        providerRef,
        linkId: `lnk_stub_${input.orderId}_${input.methodKind}`,
        redirectUrl: `https://stub.local/hpp/${input.orderId}_${input.methodKind}`,
        confirmed: false,
      };
    }

    // Unique per attempt — the value we match webhooks/reconciliation against
    // (stored as Payment.providerRef). Compact (≤50 chars) to satisfy eService's
    // `reference` limit; see makeHppReference.
    const reference = makeHppReference();
    const payload = buildHppPayload({
      accountName: this.env.ESERVICE_ACCOUNT_NAME,
      reference,
      orderReference: input.metadata?.orderNumber ?? input.orderId,
      amount: input.amount,
      currency: input.currency,
      methodKind: input.methodKind,
      payer: {
        name: input.metadata?.payerName ?? 'Customer',
        email: input.metadata?.payerEmail ?? '',
        // The platform is PL-first; default to Polish unless told otherwise.
        language: input.metadata?.language === 'en' ? 'en' : 'pl',
      },
      // Carry our orderId on the return URL so the (public) return endpoint knows
      // which order to land the customer on — no dependency on browser state
      // surviving the round-trip to eService.
      returnUrl: `${this.env.ESERVICE_RETURN_URL}?orderId=${encodeURIComponent(input.orderId)}`,
      statusUrl: this.statusUrl(),
      name: `Order ${input.metadata?.orderNumber ?? input.orderId}`,
      description: `Payment for order ${input.metadata?.orderNumber ?? input.orderId}`,
    });

    const link = await this.client.request<CreateLinkResponse>('POST', '/ucp/links', payload);

    return {
      providerRef: reference,
      linkId: link.id,
      redirectUrl: link.url,
      confirmed: false,
    };
  }

  /**
   * Expire a still-open HPP link when the customer switches method (plan §F2/§F4)
   * so the previous method-specific link can't be paid. Best-effort — swallow
   * errors (an already-expired/paid link can't be expired, which is fine). Note
   * the argument is the LNK id (Payment.providerLinkId), not the reference.
   */
  async cancelIntent(linkId: string): Promise<void> {
    if (this.stubMode || !this.client) return;
    try {
      await this.client.request('POST', `/ucp/links/${linkId}/expire`);
    } catch (err) {
      this.logger.warn(`eService cancelIntent(${linkId}) skipped: ${(err as Error).message}`);
    }
  }

  /**
   * Reconciliation status lookup (plan §F6). Filters transactions by our unique
   * `reference` and maps the resulting transaction status. Returns null in stub
   * mode / on error so the reconciliation job leaves the row alone.
   */
  async retrieveIntentStatus(providerRef: string): Promise<NormalizedIntentStatus | null> {
    const txn = await this.retrieveTransaction(providerRef);
    return txn ? mapTransactionStatus(txn.status) : null;
  }

  /**
   * Fetch the settled transaction (id + status) for our unique `reference`. Used
   * both by reconciliation and to confirm an order on the HPP return without
   * waiting for the (async / sometimes undelivered) status_url webhook. Returns
   * null in stub mode / on error so callers leave the row untouched.
   */
  async retrieveTransaction(reference: string): Promise<{ id?: string; status?: string } | null> {
    if (this.stubMode || !this.client) return null;
    try {
      const res = await this.client.request<TransactionsResponse>(
        'GET',
        `/ucp/transactions?reference=${encodeURIComponent(reference)}`,
      );
      const txns = res.transactions ?? [];
      if (txns.length === 0) return null;
      // A link spawns exactly one TRN; if several ever appear, prefer a settled
      // one so a stale INITIATED sibling can't mask a CAPTURED.
      return txns.find((t) => (t.status ?? '').toUpperCase() === 'CAPTURED') ?? txns[0];
    } catch (err) {
      this.logger.warn(`eService retrieveTransaction(${reference}) failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Refund against the settled transaction. `input.providerRef` here is the TRN
   * id (Payment.providerTxnId) — the refund endpoint targets the transaction,
   * not the link or our reference.
   */
  async refund(input: RefundInput): Promise<RefundResult> {
    if (this.stubMode || !this.client) {
      return {
        providerRef: `re_stub_${input.providerRef}`,
        amount: input.amount,
        status: 'REFUNDED' satisfies PaymentStatus,
      };
    }

    const res = await this.client.request<{ id?: string }>(
      'POST',
      `/ucp/transactions/${input.providerRef}/refund`,
      { amount: String(toMinorUnits(input.amount, input.currency)) },
    );

    return {
      providerRef: res.id ?? `re_${input.providerRef}`,
      amount: input.amount,
      status: 'REFUNDED' satisfies PaymentStatus,
    };
  }

  /**
   * Parse + verify a status-notification webhook. In stub mode we accept the
   * JSON body verbatim (the test client signs nothing). In real mode we verify
   * the `X-GP-Signature` = SHA512(rawBody + app_key) hex against the RAW bytes
   * (never re-serialized) using a constant-time compare; a mismatch returns null
   * → the controller responds 400.
   */
  parseWebhook(rawBody: Buffer, signature: string | undefined): ParsedWebhookEvent | null {
    if (!this.stubMode) {
      if (!this.verifySignature(rawBody, signature)) return null;
    }
    try {
      const body = JSON.parse(rawBody.toString('utf8')) as EserviceNotification;
      return parseNotification(body);
    } catch {
      return null;
    }
  }

  /** Authenticate a GET, form POST, or header-signed HPP return notification. */
  verifyReturnNotification(input: EserviceReturnVerificationInput): boolean {
    if (this.stubMode) return true;

    let ok = false;
    if (input.headerSignature) {
      ok = verifyEservicePostSignature(input.rawBody, input.headerSignature, this.appKey);
    } else if (input.method.toUpperCase() === 'GET') {
      ok = verifyEserviceSignedParameters(input.rawUrl, this.appKey).valid;
    } else if (input.rawBody.length > 0) {
      ok = verifyEserviceSignedParameters(input.rawBody.toString('utf8'), this.appKey).valid;
    }

    if (!ok) {
      this.logger.warn(
        `[ESERVICE_RETURN_SIG_MISMATCH] method=${input.method.toUpperCase()} ` +
          `header=${input.headerSignature ? 'present' : 'missing'} rawBytes=${input.rawBody.length}`,
      );
    }
    return ok;
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const ok = verifyEservicePostSignature(rawBody, signature, this.appKey);
    if (!ok) {
      this.logger.warn(
        `[ESERVICE_SIG_MISMATCH] signature=${signature ? `present(${signature.length})` : 'missing'} ` +
          `rawBytes=${rawBody.length}`,
      );
    }
    return ok;
  }

  private statusUrl(): string {
    // The status_url eService POSTs notifications to. Built off the public API
    // base so it resolves from eService's network. Trailing slash is trimmed so
    // we don't emit a double slash.
    const base = this.env.ESERVICE_WEBHOOK_URL.replace(/\/$/, '');
    return `${base}/api/v1/payments/webhooks/eservice`;
  }
}

interface EserviceNotification {
  id?: string;
  status?: string;
  amount?: string;
  currency?: string;
  reference?: string;
  payment_method?: { result?: string; message?: string };
  link_data?: { id?: string; reference?: string };
  action?: { id?: string; type?: string };
  // Refund-notification fields — shape unverified against a live sample (see
  // TODO below). Kept optional so a real refund notification is parsed rather
  // than dropped.
  refunds?: Array<{ id?: string; amount?: string; reason?: string | null }>;
  amount_refunded?: string;
}

/**
 * Normalize an eService status notification into a ParsedWebhookEvent. The
 * match key is `reference` (→ Payment.providerRef); the TRN id is `id`
 * (→ Payment.providerTxnId on capture); the idempotency key is `action.id`.
 */
function parseNotification(n: EserviceNotification): ParsedWebhookEvent {
  const resultCode = n.payment_method?.result;
  const status = (n.status ?? '').toUpperCase();

  // A refund notification is detected by the presence of refund details.
  // TODO(verify): confirm eService refund-notification field names against a
  // live sample — no live REFUND notification was captured during integration.
  const isRefund =
    (Array.isArray(n.refunds) && n.refunds.length > 0) ||
    n.amount_refunded !== undefined ||
    status === 'REFUNDED';

  const base: ParsedWebhookEvent = {
    // Prefer the action id (unique per notification) for idempotency; fall back
    // to the TRN id if a notification ever omits the action envelope.
    id: n.action?.id ?? n.id ?? '',
    type: isRefund ? 'payment.refunded' : classifyWebhookType(status, resultCode),
    // Live HPP notifications put our payment reference in link_data; the
    // top-level reference is the human-facing order number.
    providerRef: n.link_data?.reference ?? n.reference,
    transactionId: n.id,
    raw: n,
  };

  if (isRefund) {
    const currency = n.currency ?? 'PLN';
    const refunds: ParsedWebhookRefund[] = (n.refunds ?? []).map((r, idx) => ({
      // Fall back to a deterministic id so the dashboard-refund sync can still
      // dedupe when a live sample omits explicit refund ids.
      id: r.id ?? `${n.id ?? 'trn'}_refund_${idx}`,
      amount: r.amount ? fromMinorUnits(Number(r.amount), currency) : '0.00',
      reason: r.reason ?? null,
    }));
    if (refunds.length > 0) base.refunds = refunds;
    if (n.amount_refunded !== undefined) {
      base.amountRefunded = fromMinorUnits(Number(n.amount_refunded), currency);
    }
  }

  return base;
}
