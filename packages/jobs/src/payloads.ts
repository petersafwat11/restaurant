import { z } from 'zod';

export const EmailVerificationPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  token: z.string(),
  verifyUrl: z.string().url(),
});
export type EmailVerificationPayload = z.infer<typeof EmailVerificationPayloadSchema>;

export const PasswordResetPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  token: z.string(),
  resetUrl: z.string().url(),
});
export type PasswordResetPayload = z.infer<typeof PasswordResetPayloadSchema>;

export const SmsOtpPayloadSchema = z.object({
  phone: z.string(),
  code: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type SmsOtpPayload = z.infer<typeof SmsOtpPayloadSchema>;

export const PushWelcomePayloadSchema = z.object({
  userId: z.string(),
  firstName: z.string().nullable(),
});
export type PushWelcomePayload = z.infer<typeof PushWelcomePayloadSchema>;

export const ReceiptGeneratePayloadSchema = z.object({
  orderId: z.string(),
});
export type ReceiptGeneratePayload = z.infer<typeof ReceiptGeneratePayloadSchema>;

export const EmailReceiptPayloadSchema = z.object({
  orderId: z.string(),
  to: z.string().email(),
  pdfBase64: z.string(),
  orderNumber: z.string(),
  currency: z.string(),
  grandTotal: z.string(),
});
export type EmailReceiptPayload = z.infer<typeof EmailReceiptPayloadSchema>;

export const EmailRefundPayloadSchema = z.object({
  orderId: z.string(),
  to: z.string().email(),
  orderNumber: z.string(),
  currency: z.string(),
  amount: z.string(),
  reason: z.string().nullable(),
});
export type EmailRefundPayload = z.infer<typeof EmailRefundPayloadSchema>;

// Sprint 5 — order-lifecycle notifications dispatched on every state change.
const OrderStatusEnumSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);

export const EmailOrderStatusPayloadSchema = z.object({
  orderId: z.string(),
  userId: z.string().nullable(),
  to: z.string().email(),
  orderNumber: z.string(),
  fromStatus: OrderStatusEnumSchema,
  toStatus: OrderStatusEnumSchema,
});
export type EmailOrderStatusPayload = z.infer<typeof EmailOrderStatusPayloadSchema>;

export const SmsOrderStatusPayloadSchema = z.object({
  orderId: z.string(),
  userId: z.string().nullable(),
  phone: z.string(),
  orderNumber: z.string(),
  toStatus: OrderStatusEnumSchema,
});
export type SmsOrderStatusPayload = z.infer<typeof SmsOrderStatusPayloadSchema>;

export const PushOrderStatusPayloadSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  orderNumber: z.string(),
  toStatus: OrderStatusEnumSchema,
});
export type PushOrderStatusPayload = z.infer<typeof PushOrderStatusPayloadSchema>;

// Sprint 10 — contact-form: notify the restaurant + auto-reply the sender.
export const EmailContactPayloadSchema = z.object({
  contactMessageId: z.string(),
  name: z.string(),
  email: z.string().email(),
  subject: z.string().nullable(),
  message: z.string(),
  restaurantEmail: z.string().email(),
});
export type EmailContactPayload = z.infer<typeof EmailContactPayloadSchema>;

// Sprint 9 — prune push tokens unused for `staleDays` (default 60).
export const PushTokenCleanupPayloadSchema = z.object({
  staleDays: z.number().int().positive().optional(),
});
export type PushTokenCleanupPayload = z.infer<typeof PushTokenCleanupPayloadSchema>;

// Sprint 8 — reports + analytics + audit.
export const ReportsGeneratePayloadSchema = z.object({
  exportId: z.string(),
});
export type ReportsGeneratePayload = z.infer<typeof ReportsGeneratePayloadSchema>;

export const AnalyticsRollupPayloadSchema = z.object({
  restaurantId: z.string().optional(),
  date: z.string().optional(),
});
export type AnalyticsRollupPayload = z.infer<typeof AnalyticsRollupPayloadSchema>;

export const AuditWritePayloadSchema = z.object({
  actorUserId: z.string(),
  restaurantId: z.string().nullable().optional(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  beforeJson: z.unknown().optional(),
  afterJson: z.unknown().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});
export type AuditWritePayload = z.infer<typeof AuditWritePayloadSchema>;
