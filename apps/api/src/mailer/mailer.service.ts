import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { ENV, type ENV_TYPE } from '../config/config.module';

interface MailAttachment {
  filename: string;
  /** Raw bytes or base64 string. */
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly smtp?: Transporter;
  private readonly resend?: Resend;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    } else if (env.SMTP_HOST) {
      this.smtp = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        ignoreTLS: true,
      });
    }
  }

  /**
   * True when a transport exists (Resend API key, or an SMTP host). Callers
   * with optional mail (e.g. review requests) check this and skip with a log
   * line instead of throwing when email is not set up.
   */
  isConfigured(): boolean {
    return Boolean(this.resend || this.smtp);
  }

  async send(args: SendMailArgs): Promise<void> {
    if (this.resend) {
      // Resend v4 reports API failures in the result instead of throwing —
      // surface them so BullMQ records the failure and retries.
      const { error } = await this.resend.emails.send({
        from: this.env.MAIL_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
        attachments: args.attachments?.map((a) => ({
          filename: a.filename,
          content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
        })),
      });
      if (error) throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
      this.logger.log(`Resend → ${args.to}: ${args.subject}`);
      return;
    }

    if (!this.smtp) throw new Error('No mail transport configured');
    await this.smtp.sendMail({
      from: this.env.MAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    this.logger.log(`SMTP → ${args.to}: ${args.subject}`);
  }
}
