import type { PaymentStatus } from '@repo/types';
import type { NormalizedIntentStatus } from './provider.interface';

export type ReconcileAction = 'mark_paid' | 'mark_failed' | 'leave' | 'attention';

const TERMINAL: ReadonlySet<PaymentStatus> = new Set<PaymentStatus>([
  'PAID',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

/**
 * Pure decision for the reconciliation job (plan §F6): given the provider's
 * current intent status and our local payment status, what should we do?
 *
 * - Never touches a terminal local row (a webhook already settled it).
 * - `succeeded` at the provider but not locally PAID → a missed webhook → repair.
 * - `canceled`/`failed` → mark failed so the row stops looking actionable.
 * - `processing`/`requires_action` → the customer simply hasn't finished; leave.
 * - `unknown` → unexpected; flag for a human rather than guessing.
 * - `null` (provider couldn't determine — stub/transient) → leave; retry later.
 */
export function reconcileAction(
  intentStatus: NormalizedIntentStatus | null,
  currentStatus: PaymentStatus,
): ReconcileAction {
  if (TERMINAL.has(currentStatus)) return 'leave';
  switch (intentStatus) {
    case 'succeeded':
      return 'mark_paid';
    case 'canceled':
    case 'failed':
      return 'mark_failed';
    case 'processing':
    case 'requires_action':
      return 'leave';
    case 'unknown':
      return 'attention';
    default:
      // null — couldn't determine; try again on the next pass.
      return 'leave';
  }
}
