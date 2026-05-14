import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { ENV, type ENV_TYPE } from '../config/config.module';

export interface MailAttachment {
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
    } else {
      this.smtp = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        ignoreTLS: true,
      });
    }
  }

  async send(args: SendMailArgs): Promise<void> {
    if (this.resend) {
      await this.resend.emails.send({
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
