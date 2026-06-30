import type { OrderStatus, OrderType } from '@repo/types';

/**
 * Deterministic ETA heuristic for the tracking screen. We intentionally do not
 * call out to a routing/ETA provider — this is a documented, testable estimate:
 *
 *  - per-status "minutes of work still ahead" baseline
 *  - + a fixed delivery leg for DELIVERY orders not yet out for delivery
 *  - estimatedReadyAt anchors off the latest status-event time so the value is
 *    stable for a given order state (not wall-clock dependent), which keeps
 *    e2e assertions deterministic.
 *
 * Terminal states have no ETA.
 */

const TERMINAL: ReadonlySet<OrderStatus> = new Set([
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);

// Minutes of remaining prep/handover work by status.
const REMAINING_BY_STATUS: Partial<Record<OrderStatus, number>> = {
  PENDING: 30,
  CONFIRMED: 25,
  PREPARING: 15,
  READY: 0,
  OUT_FOR_DELIVERY: 20,
};

const DELIVERY_LEG_MINUTES = 20;

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL.has(status);
}

export function computeEta(input: {
  type: OrderType;
  status: OrderStatus;
  anchorAt: Date;
  /** Order placement time — the anchor for a staff ETA override. */
  createdAt?: Date;
  /** Staff-set total prep/delivery minutes from placement; overrides the heuristic. */
  prepMinutesOverride?: number | null;
  /** "Now" for the override countdown; defaults to anchorAt to keep the
   *  status-based path deterministic for tests. */
  now?: Date;
}): { etaMinutes: number | null; estimatedReadyAt: string | null } {
  if (isTerminalStatus(input.status)) {
    return { etaMinutes: null, estimatedReadyAt: null };
  }
  // Staff override wins: order is promised ready at (placement + override
  // minutes); the customer sees a live countdown to that fixed target.
  if (input.prepMinutesOverride != null && input.createdAt) {
    const readyAt = new Date(input.createdAt.getTime() + input.prepMinutesOverride * 60_000);
    const now = input.now ?? input.anchorAt;
    const etaMinutes = Math.max(0, Math.round((readyAt.getTime() - now.getTime()) / 60_000));
    return { etaMinutes, estimatedReadyAt: readyAt.toISOString() };
  }
  const base = REMAINING_BY_STATUS[input.status] ?? 0;
  const deliveryLeg =
    input.type === 'DELIVERY' && input.status !== 'OUT_FOR_DELIVERY' ? DELIVERY_LEG_MINUTES : 0;
  const etaMinutes = base + deliveryLeg;
  const estimatedReadyAt = new Date(input.anchorAt.getTime() + etaMinutes * 60_000).toISOString();
  return { etaMinutes, estimatedReadyAt };
}
