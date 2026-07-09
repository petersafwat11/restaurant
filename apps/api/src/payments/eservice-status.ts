import type { NormalizedIntentStatus } from './provider.interface';

/**
 * Pure eService status mapping — no I/O, unit-tested (see eservice-status.spec).
 *
 * eService reports a coarse transaction `status` (CAPTURED, DECLINED, …) and,
 * for card/BLIK, a `payment_method.result` code ('00' = authorised). We map
 * both the reconciliation status and the webhook event type off these fields
 * so the two paths (poll vs. push) stay in lock-step.
 */

/**
 * Map an eService transaction status to the reconciliation-normalized status
 * (plan §F6). Same `retrieveIntentStatus` contract used by reconciliation:
 *  - CAPTURED (settled) → 'succeeded'
 *  - DECLINED / EXPIRED / REVERSED (dead) → 'failed'
 *  - INITIATED / PENDING / PREAUTHORIZED (customer hasn't finished) →
 *    'requires_action' so reconciliation LEAVES the row (doesn't fail a link the
 *    customer may still be completing)
 *  - anything else / missing → null (indeterminate; leave + retry next pass)
 */
export function mapTransactionStatus(
  status: string | null | undefined,
): NormalizedIntentStatus | null {
  switch ((status ?? '').toUpperCase()) {
    case 'CAPTURED':
      return 'succeeded';
    case 'DECLINED':
    case 'EXPIRED':
    case 'REVERSED':
      return 'failed';
    case 'INITIATED':
    case 'PENDING':
    case 'PREAUTHORIZED':
      return 'requires_action';
    default:
      return null;
  }
}

/**
 * Classify a status-notification webhook into a `ParsedWebhookEvent.type`. A
 * capture with an authorised result ('00') is a success; a declined/expired
 * transaction is a failure; everything else is passed through as an
 * informational (non-terminal) status the dispatcher ignores.
 *
 * `resultCode` is `payment_method.result` (present for card/BLIK captures). We
 * require it to be '00' on CAPTURED so a "captured but not authorised" edge (if
 * it ever occurs) isn't misread as a success.
 */
export function classifyWebhookType(
  status: string | null | undefined,
  resultCode: string | null | undefined,
): 'payment.succeeded' | 'payment.failed' | 'payment.status' {
  const s = (status ?? '').toUpperCase();
  if (s === 'CAPTURED' && resultCode === '00') return 'payment.succeeded';
  if (s === 'DECLINED' || s === 'EXPIRED' || s === 'REVERSED') return 'payment.failed';
  return 'payment.status';
}
