import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashToken, verifyPassword } from '@repo/auth-core';
import {
  JOB_ACCOUNT_ANONYMISE,
  JOB_ACCOUNT_DELETION_CONFIRM_EMAIL,
  QUEUE_ACCOUNT_DELETION,
} from '@repo/jobs';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  type AccountDeletionStatusResponseDto,
  type ConfirmAccountDeletionDto,
  type RequestAccountDeletionDto,
} from '@repo/types';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { pseudonymiseUser } from './pseudonymise';

const CONFIRM_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour to click the email link
const GRACE_MS = ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Account deletion / anonymisation workflow (plan §G2).
 *
 * Reauth (two factors, both in-scope — OTP/social users have no password):
 *   - password: verify the current password → schedule immediately (PENDING).
 *   - email:    issue a single-use hashed confirmation token + queue the email;
 *               `confirm` consumes it and schedules.
 *
 * Scheduling enqueues a DELAYED BullMQ job with a deterministic `jobId`
 * (`anonymise:<userId>`) so re-requests never double-schedule. The processor
 * re-reads the user and no-ops unless the request is still PENDING and due, so
 * `cancel` (which just flips the status) is correct without removing the job.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @Inject(ENV) private readonly env: ENV_TYPE,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_ACCOUNT_DELETION) private readonly queue: Queue,
  ) {}

  // ---- status -----------------------------------------------------------

  async getStatus(userId: string): Promise<AccountDeletionStatusResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionStatus: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
        anonymisedAt: true,
        deletionConfirmTokenHash: true,
        deletionConfirmTokenExpires: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toStatusDto(user);
  }

  // ---- request ----------------------------------------------------------

  async request(
    userId: string,
    dto: RequestAccountDeletionDto,
  ): Promise<AccountDeletionStatusResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.deletionStatus === 'COMPLETED' || user.anonymisedAt) {
      throw new BadRequestException({
        message: 'Account is already anonymised',
        code: 'accountAlreadyAnonymised',
      });
    }

    if (dto.method === 'password') {
      // Password reauthentication — verify, then schedule immediately.
      if (!user.passwordHash) {
        throw new BadRequestException({
          message: 'Account has no password; use email confirmation instead',
          code: 'noPasswordUseEmail',
        });
      }
      const ok = await verifyPassword(dto.currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException({
          message: 'Current password is incorrect',
          code: 'invalidPassword',
        });
      }
      await this.schedule(userId, dto.reason ?? null);
      return this.getStatus(userId);
    }

    // Email-confirmation flow: issue a single-use hashed token + queue the email.
    // Status stays NONE (or whatever it was) until the link is confirmed.
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionReason: dto.reason ?? null,
        deletionConfirmTokenHash: hashToken(token),
        deletionConfirmTokenExpires: expires,
      },
    });

    const base = this.env.APP_URL_WEB.replace(/\/+$/, '');
    await this.queue.add(JOB_ACCOUNT_DELETION_CONFIRM_EMAIL, {
      userId,
      email: user.email,
      firstName: user.firstName,
      confirmUrl: `${base}/account/delete?token=${encodeURIComponent(token)}`,
    });

    return this.getStatus(userId);
  }

  // ---- confirm (email token) -------------------------------------------

  async confirm(
    userId: string,
    dto: ConfirmAccountDeletionDto,
  ): Promise<AccountDeletionStatusResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const tokenHash = hashToken(dto.token);
    const valid =
      user.deletionConfirmTokenHash !== null &&
      user.deletionConfirmTokenHash === tokenHash &&
      user.deletionConfirmTokenExpires !== null &&
      user.deletionConfirmTokenExpires.getTime() > Date.now();
    if (!valid) {
      throw new BadRequestException({
        message: 'Invalid or expired confirmation token',
        code: 'tokenInvalid',
      });
    }

    await this.schedule(userId, user.deletionReason ?? null);
    return this.getStatus(userId);
  }

  // ---- cancel -----------------------------------------------------------

  async cancel(userId: string): Promise<AccountDeletionStatusResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.deletionStatus === 'COMPLETED' || user.anonymisedAt) {
      throw new BadRequestException({
        message: 'Account is already anonymised and cannot be restored',
        code: 'accountAlreadyAnonymised',
      });
    }

    // Flip to CANCELLED and clear any outstanding token. The scheduled job is
    // left in place — it re-checks status and no-ops. We also best-effort remove
    // it so it doesn't sit in the delayed set.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionStatus: 'CANCELLED',
        deletionScheduledAt: null,
        deletionConfirmTokenHash: null,
        deletionConfirmTokenExpires: null,
      },
    });
    await this.removeScheduledJob(userId);

    return this.getStatus(userId);
  }

  // ---- execution (called by the processor) ------------------------------

  /**
   * Anonymise the account. Idempotent + safe to run on a stale/duplicate job:
   * no-ops unless the request is still PENDING and due. The User row is
   * pseudonymised, NOT deleted (Review.userId is FK-restrict; retained orders
   * keep their user link and already carry an immutable customer snapshot).
   *
   * Because the row is pseudonymised rather than deleted, NO cascade fires —
   * every PII-bearing child row must be handled explicitly here. Full per-relation
   * disposition is documented in this module's README.
   *
   * RETAINED intact (legal/accounting/fraud/dispute basis — plan §G1/§G2):
   * orders, payments, refunds, receipts, audit logs.
   *
   * DELETED (PII or transient, no longer needed once the account is gone):
   * addresses, refresh tokens, push tokens, notification preferences,
   * in-app notifications (titles/bodies carry order PII), saved payment methods,
   * carts, and staff customer notes (CRM observations about the data subject).
   *
   * DETACHED + DE-IDENTIFIED: reservations keep their operational/no-show record
   * but lose the user link and have their contact name/phone anonymised.
   *
   * NOTE (lawyer/accountant sign-off required): the treatment of optional social
   * data — reviews, loyalty, referrals (+ the referral code) — is part of the
   * retention matrix that is NOT yet authoritatively decided. We currently RETAIN
   * them behind the anonymised (identity-severed) user row. Flip to delete/detach
   * once the matrix is signed off.
   */
  async anonymise(userId: string): Promise<{ anonymised: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`anonymise: user ${userId} not found — skipping`);
      return { anonymised: false };
    }
    if (user.deletionStatus !== 'PENDING' || user.anonymisedAt) {
      // Cancelled, already done, or never scheduled — nothing to do.
      this.logger.log(
        `anonymise: user ${userId} not PENDING (status=${user.deletionStatus}) — no-op`,
      );
      return { anonymised: false };
    }
    if (user.deletionScheduledAt && user.deletionScheduledAt.getTime() > Date.now()) {
      // Not due yet (e.g. a manually-triggered early run). Leave it for the
      // scheduled job.
      this.logger.warn(`anonymise: user ${userId} not yet due — skipping`);
      return { anonymised: false };
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // 1. Revoke every session immediately.
      await tx.refreshToken.deleteMany({ where: { userId } });
      // 2. Delete PII / transient data no longer needed once the account is gone.
      await tx.userAddress.deleteMany({ where: { userId } });
      await tx.pushToken.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      // In-app notifications carry order PII (names/addresses) in title/body.
      await tx.notification.deleteMany({ where: { userId } });
      await tx.paymentMethod.deleteMany({ where: { userId } });
      // Staff CRM notes are observations about the data subject.
      await tx.customerNote.deleteMany({ where: { userId } });
      // Carts are transient; detach + remove (cart items cascade on cart delete).
      await tx.cart.deleteMany({ where: { userId } });
      // 3. De-identify reservations: keep the operational/no-show record but drop
      //    the user link and anonymise the standalone contact PII.
      await tx.reservation.updateMany({
        where: { userId },
        data: { userId: null, contactName: 'Deleted user', contactPhone: '' },
      });
      // 4. Pseudonymise the (retained) User row.
      await tx.user.update({
        where: { id: userId },
        data: {
          ...pseudonymiseUser(userId),
          deletionStatus: 'COMPLETED',
          anonymisedAt: now,
          deletionConfirmTokenHash: null,
          deletionConfirmTokenExpires: null,
        },
      });
    });

    this.logger.log(`anonymise: user ${userId} anonymised`);
    return { anonymised: true };
  }

  // ---- helpers ----------------------------------------------------------

  private async schedule(userId: string, reason: string | null): Promise<void> {
    const scheduledAt = new Date(Date.now() + GRACE_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionStatus: 'PENDING',
        deletionRequestedAt: new Date(),
        deletionScheduledAt: scheduledAt,
        deletionReason: reason,
        deletionConfirmTokenHash: null,
        deletionConfirmTokenExpires: null,
      },
    });

    // Deterministic jobId so a re-request replaces rather than duplicates. We
    // remove any existing delayed job first (BullMQ rejects re-adding the same
    // jobId while it still exists).
    await this.removeScheduledJob(userId);
    await this.queue.add(
      JOB_ACCOUNT_ANONYMISE,
      { userId },
      { jobId: this.jobId(userId), delay: GRACE_MS },
    );
  }

  private jobId(userId: string): string {
    return `anonymise:${userId}`;
  }

  private async removeScheduledJob(userId: string): Promise<void> {
    try {
      const existing = await this.queue.getJob(this.jobId(userId));
      if (existing) await existing.remove();
    } catch (err) {
      // Non-fatal — the processor re-checks state and no-ops on a stale job.
      this.logger.warn(
        `removeScheduledJob(${userId}) failed: ${(err as Error).message}`,
      );
    }
  }

  private toStatusDto(user: {
    deletionStatus: string;
    deletionRequestedAt: Date | null;
    deletionScheduledAt: Date | null;
    anonymisedAt: Date | null;
    deletionConfirmTokenHash: string | null;
    deletionConfirmTokenExpires: Date | null;
  }): AccountDeletionStatusResponseDto {
    const confirmationEmailSent =
      user.deletionConfirmTokenHash !== null &&
      user.deletionConfirmTokenExpires !== null &&
      user.deletionConfirmTokenExpires.getTime() > Date.now();
    return {
      status: user.deletionStatus as AccountDeletionStatusResponseDto['status'],
      requestedAt: user.deletionRequestedAt?.toISOString() ?? null,
      scheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
      anonymisedAt: user.anonymisedAt?.toISOString() ?? null,
      confirmationEmailSent,
      graceDays: ACCOUNT_DELETION_GRACE_DAYS,
    };
  }
}
