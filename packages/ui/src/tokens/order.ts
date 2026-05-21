/**
 * Order-domain visual tokens.
 *
 * The Tailwind class names below map 1:1 to CSS variables defined in the
 * admin's globals.css. By centralizing these, every primitive that paints
 * order status (StatusPill, ActivityTimeline, BulkActionBar deltas) reads
 * from the same source — there's no place where a status color is hardcoded.
 *
 * `bg` / `text` / `ring` / `dot` give callers the matching utility class for
 * each surface they paint.
 */

import type { OrderStatus, OrderType, PaymentStatus } from '@repo/types';

export interface VisualToken {
  /** Human-readable label, e.g. "Out for delivery". */
  label: string;
  /** Tailwind class for solid background (e.g. on a chip's dot). */
  bg: string;
  /** Tailwind class for foreground text in the chip body. */
  text: string;
  /** Tailwind class for the background tint behind status pill content. */
  tint: string;
  /** Tailwind class for the colored ring used by ActivityTimeline current event. */
  ring: string;
  /** Raw CSS-var token name (e.g. "var(--status-ready)") for inline use. */
  varRef: string;
}

function tok(status: string, label: string, slug: string): VisualToken {
  return {
    label,
    bg: `bg-status-${slug}`,
    text: `text-status-${slug}`,
    tint: `bg-status-${slug}/10`,
    ring: `ring-status-${slug}`,
    varRef: `var(--status-${slug})`,
  };
}

export const STATUS_TOKENS: Record<OrderStatus, VisualToken> = {
  PENDING: tok('PENDING', 'Pending', 'pending'),
  CONFIRMED: tok('CONFIRMED', 'Confirmed', 'confirmed'),
  PREPARING: tok('PREPARING', 'Preparing', 'preparing'),
  READY: tok('READY', 'Ready', 'ready'),
  OUT_FOR_DELIVERY: tok('OUT_FOR_DELIVERY', 'Out for delivery', 'out-for-delivery'),
  DELIVERED: tok('DELIVERED', 'Delivered', 'delivered'),
  COMPLETED: tok('COMPLETED', 'Completed', 'delivered'),
  CANCELLED: tok('CANCELLED', 'Cancelled', 'cancelled'),
  REFUNDED: tok('REFUNDED', 'Refunded', 'refunded'),
};

/**
 * Allowed forward transitions per current status. Used by StatusPill's
 * "Advance to" menu and BulkActionBar's "Advance N orders" action.
 *
 * Mirrors the backend FSM in apps/api/src/orders/order-state-machine.ts —
 * keep them in sync. Notable: PENDING → CONFIRMED is system-only (fired by
 * the Stripe webhook / COD short-circuit), so staff have no manual advance
 * from PENDING — only Cancel.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

/** Linear "next" status for the Advance shortcut (key 1 → ?, etc.). */
export const ADVANCE_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

export const PAYMENT_TOKENS: Record<PaymentStatus, VisualToken> = {
  PENDING: tok('PENDING', 'Pending', 'preparing'), // amber
  AUTHORIZED: tok('AUTHORIZED', 'Authorized', 'confirmed'),
  PAID: tok('PAID', 'Paid', 'delivered'),
  REFUNDED: tok('REFUNDED', 'Refunded', 'refunded'),
  PARTIALLY_REFUNDED: tok('PARTIALLY_REFUNDED', 'Partial refund', 'refunded'),
  FAILED: tok('FAILED', 'Failed', 'cancelled'),
};

export const TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine-in',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
};
