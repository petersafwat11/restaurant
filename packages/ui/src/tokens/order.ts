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

// Forward-transition logic moved to `@repo/types` (`forwardTransitions`,
// `nextStatusFor`) — a single, TYPE-AWARE source of truth shared with the API
// state machine. The old map here was type-blind (offered OUT_FOR_DELIVERY for
// pickup orders) and drifted from the backend; importers now call the helpers.

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
