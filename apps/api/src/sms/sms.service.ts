import { Inject, Injectable, Logger } from '@nestjs/common';
import twilio, { type Twilio } from 'twilio';
import { ENV, type ENV_TYPE } from '../config/config.module';

export interface SendSmsArgs {
  to: string;
  body: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client?: Twilio;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
  }

  async send(args: SendSmsArgs): Promise<void> {
    if (this.client && this.env.TWILIO_FROM) {
      await this.client.messages.create({
        from: this.env.TWILIO_FROM,
        to: args.to,
        body: args.body,
      });
      return;
    }
    // Dev fallback — console adapter
    this.logger.log(`[SMS → ${args.to}] ${args.body}`);
  }
}
