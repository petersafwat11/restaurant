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

export const EmailContactReplyPayloadSchema = z.object({
  contactMessageId: z.string(),
  toEmail: z.string().email(),
  toName: z.string(),
  subject: z.string(),
  body: z.string(),
  fromUserId: z.string(),
});
export type EmailContactReplyPayload = z.infer<typeof EmailContactReplyPayloadSchema>;

export const EmailPromoPayloadSchema = z.object({
  campaignId: z.string(),
  recipients: z
    .array(
      z.object({
        userId: z.string().nullable(),
        email: z.string().email(),
        name: z.string().nullable(),
      }),
    )
    .min(1)
    .max(5000),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  fromUserId: z.string(),
});
export type EmailPromoPayload = z.infer<typeof EmailPromoPayloadSchema>;

// Marketing — newsletter double opt-in confirmation email.
export const EmailNewsletterConfirmPayloadSchema = z.object({
  email: z.string().email(),
  confirmUrl: z.string().url(),
  unsubscribeUrl: z.string().url(),
});
export type EmailNewsletterConfirmPayload = z.infer<typeof EmailNewsletterConfirmPayloadSchema>;

// Sprint 11 — referral invite email.
// Sprint 8 — analytics + audit.
export const AnalyticsRollupPayloadSchema = z.object({
  date: z.string().optional(),
});
export type AnalyticsRollupPayload = z.infer<typeof AnalyticsRollupPayloadSchema>;

// Slice 9 / §G2 — anonymise the account once the grace period elapses. The
// processor re-reads the user and no-ops unless the request is still PENDING and
// due, so a stale/duplicate job is harmless.
export const AccountAnonymisePayloadSchema = z.object({
  userId: z.string(),
});
export type AccountAnonymisePayload = z.infer<typeof AccountAnonymisePayloadSchema>;

// Single-use email-confirmation link for the no-password account-deletion path.
export const AccountDeletionConfirmEmailPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  confirmUrl: z.string().url(),
});
export type AccountDeletionConfirmEmailPayload = z.infer<
  typeof AccountDeletionConfirmEmailPayloadSchema
>;

// Auto-archive a delivered order to COMPLETED after the post-delivery grace
// window. The processor re-reads the order and no-ops unless it is still
// DELIVERED, so a stale/duplicate job is harmless.
export const OrderAutoCompletePayloadSchema = z.object({
  orderId: z.string(),
});
export type OrderAutoCompletePayload = z.infer<typeof OrderAutoCompletePayloadSchema>;

export const AuditWritePayloadSchema = z.object({
  actorUserId: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  beforeJson: z.unknown().optional(),
  afterJson: z.unknown().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});
export type AuditWritePayload = z.infer<typeof AuditWritePayloadSchema>;
