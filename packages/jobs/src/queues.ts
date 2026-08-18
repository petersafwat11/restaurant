export const QUEUE_EMAIL = 'email';
export const QUEUE_SMS = 'sms';
export const QUEUE_RECEIPT = 'receipt';
export const QUEUE_ANALYTICS = 'analytics';
export const QUEUE_AUDIT = 'audit';
export const QUEUE_RECONCILIATION = 'reconciliation';
export const QUEUE_ACCOUNT_DELETION = 'account-deletion';
export const QUEUE_ORDERS = 'orders';
export const QUEUE_WEBPUSH = 'webpush';

export const QUEUE_NAMES = {
  email: QUEUE_EMAIL,
  sms: QUEUE_SMS,
  receipt: QUEUE_RECEIPT,
  analytics: QUEUE_ANALYTICS,
  audit: QUEUE_AUDIT,
  reconciliation: QUEUE_RECONCILIATION,
  accountDeletion: QUEUE_ACCOUNT_DELETION,
  orders: QUEUE_ORDERS,
  webpush: QUEUE_WEBPUSH,
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job names within each queue
export const JOB_EMAIL_VERIFICATION = 'email.verification';
export const JOB_EMAIL_PASSWORD_RESET = 'email.password-reset';
export const JOB_EMAIL_RECEIPT = 'email.receipt';
export const JOB_EMAIL_REFUND = 'email.refund';
export const JOB_EMAIL_ORDER_STATUS = 'email.order-status';
export const JOB_EMAIL_CONTACT = 'email.contact';
export const JOB_EMAIL_CONTACT_REPLY = 'email.contact-reply';
export const JOB_EMAIL_PROMO = 'email.promo';
export const JOB_EMAIL_NEWSLETTER_CONFIRM = 'email.newsletter-confirm';
export const JOB_EMAIL_STAFF_ACCOUNT_CREATED = 'email.staff-account-created';
export const JOB_SMS_OTP = 'sms.otp';
export const JOB_SMS_ORDER_STATUS = 'sms.order-status';
export const JOB_RECEIPT_GENERATE = 'receipt.generate';
export const JOB_ANALYTICS_ROLLUP_DAILY = 'analytics.rollup-daily';
export const JOB_ANALYTICS_ROLLUP_FINALIZE = 'analytics.rollup-finalize';
export const JOB_AUDIT_WRITE = 'audit.write';
export const JOB_PAYMENT_RECONCILE = 'payment.reconcile';
// Slice 9 / §G2 — anonymise an account whose grace period has elapsed. Enqueued
// (delayed) when a deletion is confirmed; the processor re-checks state and
// no-ops if the request was cancelled.
export const JOB_ACCOUNT_ANONYMISE = 'account.anonymise';
// Send the single-use email-confirmation link for the no-password reauth path.
// Queued (never awaited in the request handler) on this queue so the deletion
// module owns its own side-effects without touching the shared email processor.
export const JOB_ACCOUNT_DELETION_CONFIRM_EMAIL = 'account.deletion-confirm-email';
// Auto-archive a delivered order (DELIVERED → COMPLETED) once its post-delivery
// grace window elapses. Enqueued (delayed) when an order is marked DELIVERED; the
// processor re-reads the order and no-ops unless it is still DELIVERED.
export const JOB_ORDER_AUTO_COMPLETE = 'order.auto-complete';
export const JOB_WEBPUSH_NEW_ORDER = 'webpush.new-order';
export const JOB_WEBPUSH_PENDING_ORDER_REMINDER = 'webpush.pending-order-reminder';
// Ring burst — repeats the new-order notification (same tag + renotify) so the
// device re-sounds its notification channel every RING_INTERVAL_MS while the
// order is still unacknowledged and the PWA is closed.
export const JOB_WEBPUSH_ORDER_RING = 'webpush.order-ring';

// Ring burst tuning shared by producer and processor.
export const WEBPUSH_RING_INTERVAL_MS = 30_000;
export const WEBPUSH_RING_MAX_STEPS = 6;
