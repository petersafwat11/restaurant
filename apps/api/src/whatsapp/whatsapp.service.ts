import { Inject, Injectable, Logger } from '@nestjs/common';
import twilio, { type Twilio } from 'twilio';
import { ENV, type ENV_TYPE } from '../config/config.module';

export interface SendWhatsappArgs {
  /** Recipient in E.164 (e.g. "+48600100200"); the `whatsapp:` prefix is added. */
  to: string;
  body: string;
}

/**
 * WhatsApp delivery via Twilio's WhatsApp sender. Mirrors `SmsService` but
 * prefixes both the from/to numbers with `whatsapp:` per Twilio's API. Falls
 * back to a console log in dev / when no sender is configured.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client?: Twilio;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
  }

  async send(args: SendWhatsappArgs): Promise<void> {
    if (this.client && this.env.TWILIO_WHATSAPP_FROM) {
      await this.client.messages.create({
        from: withPrefix(this.env.TWILIO_WHATSAPP_FROM),
        to: withPrefix(args.to),
        body: args.body,
      });
      return;
    }
    // Dev fallback — console adapter
    this.logger.log(`[WhatsApp → ${args.to}] ${args.body}`);
  }
}

function withPrefix(number: string): string {
  return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
}
