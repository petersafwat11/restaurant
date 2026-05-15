export const QUEUE_EMAIL = 'email';
export const QUEUE_SMS = 'sms';
export const QUEUE_PUSH = 'push';
export const QUEUE_RECEIPT = 'receipt';
export const QUEUE_REPORTS = 'reports';
export const QUEUE_ANALYTICS = 'analytics';
export const QUEUE_AUDIT = 'audit';
export const QUEUE_R2_CLEANUP = 'r2.orphan-cleanup';

export const QUEUE_NAMES = {
  email: QUEUE_EMAIL,
  sms: QUEUE_SMS,
  push: QUEUE_PUSH,
  receipt: QUEUE_RECEIPT,
  reports: QUEUE_REPORTS,
  analytics: QUEUE_ANALYTICS,
  audit: QUEUE_AUDIT,
  r2Cleanup: QUEUE_R2_CLEANUP,
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job names within each queue
export const JOB_EMAIL_VERIFICATION = 'email.verification';
export const JOB_EMAIL_PASSWORD_RESET = 'email.password-reset';
export const JOB_EMAIL_RECEIPT = 'email.receipt';
export const JOB_EMAIL_REFUND = 'email.refund';
export const JOB_EMAIL_ORDER_STATUS = 'email.order-status';
export const JOB_EMAIL_CONTACT = 'email.contact';
export const JOB_SMS_OTP = 'sms.otp';
export const JOB_SMS_ORDER_STATUS = 'sms.order-status';
export const JOB_PUSH_WELCOME = 'push.welcome';
export const JOB_PUSH_ORDER_STATUS = 'push.order-status';
export const JOB_PUSH_TOKEN_CLEANUP = 'push.token-cleanup';
export const JOB_PUSH_LOYALTY = 'push.loyalty';
export const JOB_EMAIL_REFERRAL_INVITE = 'email.referral-invite';
export const JOB_RECEIPT_GENERATE = 'receipt.generate';
export const JOB_REPORTS_GENERATE = 'reports.generate';
export const JOB_REPORTS_CLEANUP = 'reports.cleanup';
export const JOB_ANALYTICS_ROLLUP_DAILY = 'analytics.rollup-daily';
export const JOB_ANALYTICS_ROLLUP_FINALIZE = 'analytics.rollup-finalize';
export const JOB_AUDIT_WRITE = 'audit.write';
export const JOB_R2_ORPHAN_SWEEP = 'r2.orphan-sweep';
