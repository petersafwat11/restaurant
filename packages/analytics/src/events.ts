import { z } from 'zod';

/**
 * Typed product-analytics event catalog — the single source of truth for
 * event names + payload shapes (mirrors `@repo/jobs`). The server captures a
 * deliberately small set of high-signal backend events; UI/autocapture is a
 * UI-sprint concern.
 */
export const ANALYTICS_EVENT_SCHEMAS = {
  signup: z.object({
    userId: z.string(),
    referred: z.boolean(),
  }),
  order_placed: z.object({
    userId: z.string().nullable(),
    orderId: z.string(),
    grandTotal: z.string(),
    currency: z.string(),
    type: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
  }),
  payment_succeeded: z.object({
    userId: z.string().nullable(),
    orderId: z.string(),
    amount: z.string(),
    currency: z.string(),
    method: z.string(),
  }),
  loyalty_redeemed: z.object({
    userId: z.string(),
    orderId: z.string(),
    points: z.number().int(),
    discount: z.string(),
  }),
  referral_completed: z.object({
    referrerId: z.string(),
    refereeId: z.string(),
  }),
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_SCHEMAS;

export type AnalyticsEventPayload<E extends AnalyticsEventName> = z.infer<
  (typeof ANALYTICS_EVENT_SCHEMAS)[E]
>;

export const ANALYTICS_EVENT_NAMES = Object.keys(ANALYTICS_EVENT_SCHEMAS) as AnalyticsEventName[];
