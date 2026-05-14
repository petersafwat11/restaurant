import type { OrderStatus, OrderType } from '@repo/types';

/**
 * Logical role used by transition rules. Maps from a request user's roles
 * (string[]) via `actorRoleFor(roles)`. SYSTEM is reserved for transitions
 * fired by jobs/webhooks (e.g., refund → REFUNDED, post-delivery auto-COMPLETED).
 */
export type ActorRole = 'customer' | 'kitchen' | 'cashier' | 'manager' | 'owner' | 'system';

/**
 * Reduce the multiset of role keys on the request user to a single logical
 * `ActorRole` for state-machine evaluation. Highest privilege wins.
 */
export function actorRoleFor(roles: readonly string[]): ActorRole {
  if (roles.includes('owner')) return 'owner';
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('cashier')) return 'cashier';
  if (roles.includes('kitchen')) return 'kitchen';
  return 'customer';
}

const STAFF: readonly ActorRole[] = ['cashier', 'manager', 'owner'];
const KITCHEN_OR_STAFF: readonly ActorRole[] = ['kitchen', 'cashier', 'manager', 'owner'];
const ADMIN: readonly ActorRole[] = ['manager', 'owner'];

interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  /** Roles that may fire this transition. `system` is implicit on top of these. */
  allowed: readonly ActorRole[];
  /** Optional order-type gate. */
  onlyForTypes?: readonly OrderType[];
  /** Reason required (e.g., cancellations). */
  reasonRequired?: boolean;
  description: string;
}

const RULES: readonly TransitionRule[] = [
  // Payment-confirmed (also fired by COD short-circuit + Stripe webhook).
  {
    from: 'PENDING',
    to: 'CONFIRMED',
    allowed: [],
    description: 'Order confirmed by payment provider',
  },
  // Customer or staff may cancel pre-payment.
  {
    from: 'PENDING',
    to: 'CANCELLED',
    allowed: ['customer', ...STAFF],
    reasonRequired: false,
    description: 'Pre-payment cancellation',
  },
  // Kitchen workflow.
  {
    from: 'CONFIRMED',
    to: 'PREPARING',
    allowed: KITCHEN_OR_STAFF,
    description: 'Order entered preparation',
  },
  {
    from: 'PREPARING',
    to: 'READY',
    allowed: KITCHEN_OR_STAFF,
    description: 'Order ready for pickup/delivery',
  },
  {
    from: 'READY',
    to: 'OUT_FOR_DELIVERY',
    allowed: STAFF,
    onlyForTypes: ['DELIVERY'],
    description: 'Order handed to driver',
  },
  {
    from: 'READY',
    to: 'COMPLETED',
    allowed: STAFF,
    onlyForTypes: ['PICKUP', 'DINE_IN'],
    description: 'Pickup or dine-in order completed at counter',
  },
  {
    from: 'OUT_FOR_DELIVERY',
    to: 'DELIVERED',
    allowed: STAFF,
    description: 'Driver confirmed delivery',
  },
  {
    from: 'DELIVERED',
    to: 'COMPLETED',
    allowed: [], // system-only — fired by post-delivery grace-period job
    description: 'Auto-complete after delivery grace period',
  },
];

// `* → CANCELLED` covered by the PENDING rule above. Plan requires that
// **post-payment** cancellations go through the refund flow instead — so
// staff cannot cancel a CONFIRMED-or-later order. Refund transitions to
// REFUNDED are fired by the payments service (system role).
const ANY_TO_REFUNDED: readonly OrderStatus[] = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export interface TransitionContext {
  from: OrderStatus;
  to: OrderStatus;
  actor: ActorRole;
  orderType: OrderType;
  reason?: string | null;
}

export type TransitionResult = { ok: true } | { ok: false; reason: string };

/**
 * Pure transition guard. Returns `{ ok: true }` if the transition is allowed
 * for the actor + order type, otherwise `{ ok: false, reason }`.
 *
 * System transitions (`actor === 'system'`) bypass role gates but still
 * respect type gating + the rules table.
 */
export function canTransition(ctx: TransitionContext): TransitionResult {
  // Same-state is a no-op — reject so callers can distinguish.
  if (ctx.from === ctx.to) {
    return { ok: false, reason: 'Order is already in that status' };
  }

  // System path: any-status → REFUNDED is allowed when in the post-payment
  // window. Refunds out of PENDING aren't a refund (use cancel instead).
  if (ctx.to === 'REFUNDED') {
    if (ctx.actor !== 'system') {
      return { ok: false, reason: 'REFUNDED is system-only; use the refund flow' };
    }
    if (!ANY_TO_REFUNDED.includes(ctx.from)) {
      return { ok: false, reason: `Cannot refund from ${ctx.from}` };
    }
    return { ok: true };
  }

  const rule = RULES.find((r) => r.from === ctx.from && r.to === ctx.to);
  if (!rule) {
    return { ok: false, reason: `Illegal transition ${ctx.from} → ${ctx.to}` };
  }

  if (rule.onlyForTypes && !rule.onlyForTypes.includes(ctx.orderType)) {
    return {
      ok: false,
      reason: `Transition ${ctx.from} → ${ctx.to} is not valid for ${ctx.orderType} orders`,
    };
  }

  // System bypass for role gating (e.g., webhook-driven PENDING → CONFIRMED).
  if (ctx.actor === 'system') return { ok: true };

  if (rule.allowed.length === 0) {
    return { ok: false, reason: `Transition ${ctx.from} → ${ctx.to} is system-only` };
  }

  if (!rule.allowed.includes(ctx.actor)) {
    return {
      ok: false,
      reason: `${ctx.actor} cannot transition ${ctx.from} → ${ctx.to}`,
    };
  }

  return { ok: true };
}

/** Exhaustive list of every legal (from, to) pair — used for tests + docs. */
export function legalTransitions(): readonly { from: OrderStatus; to: OrderStatus }[] {
  return RULES.map((r) => ({ from: r.from, to: r.to }));
}
