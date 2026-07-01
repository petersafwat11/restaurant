import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  AccountAnonymisePayloadSchema,
  AccountDeletionConfirmEmailPayloadSchema,
  JOB_ACCOUNT_ANONYMISE,
  JOB_ACCOUNT_DELETION_CONFIRM_EMAIL,
  QUEUE_ACCOUNT_DELETION,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { MailerService } from '../mailer/mailer.service';
import { AccountDeletionService } from './account-deletion.service';

/**
 * Worker for the account-deletion queue (plan §G2):
 *  - `account.anonymise` (delayed to grace-period end) → run the anonymisation,
 *    which itself re-checks state and no-ops if the request was cancelled.
 *  - `account.deletion-confirm-email` → send the single-use confirmation link
 *    for the no-password reauth path (queued so it's never awaited in the
 *    request handler; sent here via MailerService rather than touching the
 *    shared email processor).
 */
@Processor(QUEUE_ACCOUNT_DELETION)
export class AccountDeletionProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountDeletionProcessor.name);

  constructor(
    private readonly service: AccountDeletionService,
    private readonly mailer: MailerService,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_ACCOUNT_ANONYMISE: {
        const { userId } = AccountAnonymisePayloadSchema.parse(job.data);
        await this.service.anonymise(userId);
        return;
      }
      case JOB_ACCOUNT_DELETION_CONFIRM_EMAIL: {
        const payload = AccountDeletionConfirmEmailPayloadSchema.parse(job.data);
        const greeting = payload.firstName ? `Hi ${payload.firstName}` : 'Hello';
        await this.mailer.send({
          to: payload.email,
          subject: 'Confirm your Szef Donald account deletion',
          html:
            `<p>${greeting},</p>` +
            `<p>We received a request to delete your Szef Donald account. To confirm, click below within the next hour:</p>` +
            `<p><a href="${payload.confirmUrl}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Confirm account deletion</a></p>` +
            `<p>After you confirm, your account is scheduled for anonymisation and you can still cancel during the grace period. If you didn't request this, ignore this email — nothing will happen.</p>`,
          text:
            `${greeting},\n\n` +
            `We received a request to delete your Szef Donald account. Confirm within the next hour:\n${payload.confirmUrl}\n\n` +
            `After you confirm, your account is scheduled for anonymisation and you can still cancel during the grace period. If you didn't request this, ignore this email.`,
        });
        return;
      }
      default:
        this.logger.warn(`Unknown account-deletion job: ${job.name}`);
    }
  }
}
