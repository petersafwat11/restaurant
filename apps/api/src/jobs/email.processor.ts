import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  EmailOrderStatusPayloadSchema,
  EmailReceiptPayloadSchema,
  EmailRefundPayloadSchema,
  EmailVerificationPayloadSchema,
  JOB_EMAIL_ORDER_STATUS,
  JOB_EMAIL_PASSWORD_RESET,
  JOB_EMAIL_RECEIPT,
  JOB_EMAIL_REFUND,
  JOB_EMAIL_VERIFICATION,
  PasswordResetPayloadSchema,
  QUEUE_EMAIL,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { MailerService } from '../mailer/mailer.service';
import { renderEmailVerification } from '../mailer/templates/email-verification';
import { renderPasswordReset } from '../mailer/templates/password-reset';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_EMAIL_VERIFICATION: {
        const payload = EmailVerificationPayloadSchema.parse(job.data);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
        });
        const { html, text } = await renderEmailVerification({
          verifyUrl: payload.verifyUrl,
          firstName: user?.firstName ?? null,
        });
        await this.mailer.send({
          to: payload.email,
          subject: 'Verify your email',
          html,
          text,
        });
        return;
      }
      case JOB_EMAIL_PASSWORD_RESET: {
        const payload = PasswordResetPayloadSchema.parse(job.data);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
        });
        const { html, text } = await renderPasswordReset({
          resetUrl: payload.resetUrl,
          firstName: user?.firstName ?? null,
        });
        await this.mailer.send({
          to: payload.email,
          subject: 'Reset your password',
          html,
          text,
        });
        return;
      }
      case JOB_EMAIL_RECEIPT: {
        const payload = EmailReceiptPayloadSchema.parse(job.data);
        await this.mailer.send({
          to: payload.to,
          subject: `Receipt for order ${payload.orderNumber}`,
          html: `<p>Thanks for your order.</p><p>Order ${payload.orderNumber} — total ${payload.grandTotal} ${payload.currency}.</p>`,
          text: `Thanks for your order. Order ${payload.orderNumber} — total ${payload.grandTotal} ${payload.currency}.`,
          attachments: [
            {
              filename: `receipt-${payload.orderNumber}.pdf`,
              content: Buffer.from(payload.pdfBase64, 'base64'),
              contentType: 'application/pdf',
            },
          ],
        });
        return;
      }
      case JOB_EMAIL_REFUND: {
        const payload = EmailRefundPayloadSchema.parse(job.data);
        await this.mailer.send({
          to: payload.to,
          subject: `Refund for order ${payload.orderNumber}`,
          html: `<p>We've issued a refund of ${payload.amount} ${payload.currency} for order ${payload.orderNumber}.${payload.reason ? `</p><p>Reason: ${payload.reason}.` : ''}</p>`,
          text: `Refund of ${payload.amount} ${payload.currency} issued for order ${payload.orderNumber}.`,
        });
        return;
      }
      case JOB_EMAIL_ORDER_STATUS: {
        const payload = EmailOrderStatusPayloadSchema.parse(job.data);
        const subject = orderStatusSubject(payload.toStatus, payload.orderNumber);
        const body = orderStatusBody(payload.toStatus, payload.orderNumber);
        await this.mailer.send({
          to: payload.to,
          subject,
          html: `<p>${body}</p>`,
          text: body,
        });
        return;
      }
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}

function orderStatusSubject(status: string, orderNumber: string): string {
  switch (status) {
    case 'PENDING':
      return `Order ${orderNumber} placed`;
    case 'CANCELLED':
      return `Order ${orderNumber} cancelled`;
    case 'REFUNDED':
      return `Order ${orderNumber} refunded`;
    default:
      return `Order ${orderNumber} update`;
  }
}

function orderStatusBody(status: string, orderNumber: string): string {
  switch (status) {
    case 'PENDING':
      return `Thanks — we've received order ${orderNumber}. We'll let you know when it's confirmed.`;
    case 'CANCELLED':
      return `Your order ${orderNumber} has been cancelled.`;
    case 'REFUNDED':
      return `A refund has been issued for order ${orderNumber}.`;
    default:
      return `Order ${orderNumber} is now ${status}.`;
  }
}
