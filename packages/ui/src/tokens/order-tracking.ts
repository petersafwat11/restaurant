import type { OrderStatus, OrderType } from '@repo/types';

/**
 * Step labels for the customer-facing OrderProgressStepper.
 *
 * Maps OrderType → ordered list of step labels. OrderStatus → index into the
 * list (or 'terminal-error' for CANCELLED/REFUNDED).
 *
 * Lives in tokens so the order-tracking page header can compute "current
 * step" without importing the primitive.
 */

export const ORDER_TRACKING_STEPS: Record<OrderType, string[]> = {
  DELIVERY: ['Confirmed', 'Preparing', 'On the way', 'Delivered'],
  PICKUP: ['Confirmed', 'Preparing', 'Ready for pickup', 'Picked up'],
  DINE_IN: ['Confirmed', 'Preparing', 'Served'],
};

export type OrderTrackingState =
  | { kind: 'step'; index: number }
  | { kind: 'cancelled' }
  | { kind: 'refunded' };

export function trackingStateFor(mode: OrderType, status: OrderStatus): OrderTrackingState {
  if (status === 'CANCELLED') return { kind: 'cancelled' };
  if (status === 'REFUNDED') return { kind: 'refunded' };

  const steps = ORDER_TRACKING_STEPS[mode];
  // PENDING shows as step 0 active; CONFIRMED matches; PREPARING is step 1; etc.
  const map: Partial<Record<OrderStatus, number>> = {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 1,
    READY: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: steps.length - 1,
    COMPLETED: steps.length - 1,
  };
  return { kind: 'step', index: map[status] ?? 0 };
}
