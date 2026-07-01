import { z } from 'zod';

/**
 * Account deletion / anonymisation (GDPR right-to-erasure) — Slice 9 / plan §G2.
 *
 * Workflow: a verified, self-service request schedules an anonymisation job after
 * a short grace period. The customer reauthenticates with EITHER their current
 * password (immediate scheduling) OR a single-use email-confirmation token. The
 * link to the User is then anonymised — accounting/payment/audit records are
 * RETAINED intact (the Order carries its own immutable customer snapshot).
 *
 * NOTE (owner/lawyer sign-off required): the grace-period length below and the
 * full retention/anonymisation matrix (esp. whether reviews/loyalty/referrals are
 * retained for an anonymised account) are PROVISIONAL defaults — they need
 * accountant/lawyer confirmation before production (plan §G1).
 */

/** Provisional grace period, in days, between confirmation and anonymisation. */
export const ACCOUNT_DELETION_GRACE_DAYS = 7;

/**
 * Lifecycle of a deletion request. MUST stay identical to the Prisma
 * `AccountDeletionStatus` enum (packages/db/prisma/schema.prisma).
 *
 * - NONE       no active request (default; also the state while an email
 *              confirmation token is outstanding but unconfirmed)
 * - PENDING    confirmed + scheduled; the anonymisation job is queued
 * - CANCELLED  the customer cancelled during the grace period
 * - COMPLETED  the anonymisation job has run; the account is anonymised
 */
export const ACCOUNT_DELETION_STATUSES = ['NONE', 'PENDING', 'CANCELLED', 'COMPLETED'] as const;
export const AccountDeletionStatusSchema = z.enum(ACCOUNT_DELETION_STATUSES);
export type AccountDeletionStatus = z.infer<typeof AccountDeletionStatusSchema>;

/**
 * Which reauthentication factor the customer used on `request`.
 * - `password`: verify the current password, then schedule immediately.
 * - `email`: no password (e.g. social/OTP users); the server emails a single-use
 *   confirmation token. Scheduling happens on `confirm`.
 */
export const DeletionReauthMethodSchema = z.enum(['password', 'email']);
export type DeletionReauthMethod = z.infer<typeof DeletionReauthMethodSchema>;

/**
 * `POST /account/deletion/request`. Exactly one factor:
 *  - `{ method: 'password', currentPassword }` → schedule now (status PENDING).
 *  - `{ method: 'email' }`                     → send confirmation email (status NONE).
 * `reason` is optional, free-form feedback (never required to exercise the right).
 */
export const RequestAccountDeletionSchema = z
  .discriminatedUnion('method', [
    z.object({
      method: z.literal('password'),
      currentPassword: z.string().min(1).max(200),
      reason: z.string().max(1000).optional(),
    }),
    z.object({
      method: z.literal('email'),
      reason: z.string().max(1000).optional(),
    }),
  ])
  .describe('Account deletion request — password reauth or email-token flow');
export type RequestAccountDeletionDto = z.infer<typeof RequestAccountDeletionSchema>;

/** `POST /account/deletion/confirm` — consume the single-use email token. */
export const ConfirmAccountDeletionSchema = z.object({
  token: z.string().min(1).max(512),
});
export type ConfirmAccountDeletionDto = z.infer<typeof ConfirmAccountDeletionSchema>;

/**
 * `POST /account/deletion/request` (email flow) and `/confirm` return a status.
 * `/cancel` takes no body.
 */
export const AccountDeletionStatusResponseSchema = z.object({
  status: AccountDeletionStatusSchema,
  /** ISO time the customer requested deletion (null when no active request). */
  requestedAt: z.string().nullable(),
  /** ISO time the anonymisation job is scheduled to run (null until PENDING). */
  scheduledAt: z.string().nullable(),
  /** ISO time the account was anonymised (null until COMPLETED). */
  anonymisedAt: z.string().nullable(),
  /**
   * True when a single-use email confirmation token is outstanding (email flow,
   * not yet confirmed). Lets the UI show "check your inbox".
   */
  confirmationEmailSent: z.boolean(),
  /** Effective grace period in days, surfaced so the UI shows the right copy. */
  graceDays: z.number().int().positive(),
});
export type AccountDeletionStatusResponseDto = z.infer<typeof AccountDeletionStatusResponseSchema>;
