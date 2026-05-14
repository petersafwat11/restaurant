import { z } from 'zod';

const MoneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Money must be a decimal string with ≤2dp');

export const PAYMENT_PROVIDERS = ['stripe', 'cod'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_METHOD_KINDS = [
  'STRIPE_CARD',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'COD',
  'WALLET',
  'P24',
  'BLIK',
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ---- Create intent ---------------------------------------------------------

export const CreatePaymentIntentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(PAYMENT_PROVIDERS),
  methodKind: z.enum(PAYMENT_METHOD_KINDS),
});
export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;

export const PaymentIntentResponseSchema = z.object({
  paymentId: z.string(),
  provider: z.enum(PAYMENT_PROVIDERS),
  status: z.enum(PAYMENT_STATUSES),
  /** Stripe-only — present when provider === 'stripe'. */
  clientSecret: z.string().nullable(),
  /** Stripe-only — present when provider === 'stripe'. */
  publishableKey: z.string().nullable(),
  /** COD — true when the order was auto-confirmed (no further client action). */
  confirmed: z.boolean(),
});
export type PaymentIntentResponseDto = z.infer<typeof PaymentIntentResponseSchema>;

// ---- Payment row -----------------------------------------------------------

export const PaymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  provider: z.string(),
  providerRef: z.string().nullable(),
  method: z.enum(PAYMENT_METHOD_KINDS),
  amount: MoneyStringSchema,
  currency: z.string(),
  status: z.enum(PAYMENT_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentDto = z.infer<typeof PaymentSchema>;

// ---- Refund ----------------------------------------------------------------

export const RefundSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  amount: MoneyStringSchema,
  reason: z.string().nullable(),
  providerRef: z.string().nullable(),
  createdAt: z.string(),
});
export type RefundDto = z.infer<typeof RefundSchema>;

export const CreateRefundSchema = z.object({
  /** Optional — omit for a full refund of the remaining amount. */
  amount: MoneyStringSchema.optional(),
  reason: z.string().min(1).max(500),
});
export type CreateRefundDto = z.infer<typeof CreateRefundSchema>;

// ---- Public config ---------------------------------------------------------

export const PaymentConfigSchema = z.object({
  stripePublishableKey: z.string(),
  currency: z.string(),
});
export type PaymentConfigDto = z.infer<typeof PaymentConfigSchema>;

export const PaymentListSchema = z.array(PaymentSchema);
export const RefundListSchema = z.array(RefundSchema);
