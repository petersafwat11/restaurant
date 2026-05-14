import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_SMS_ORDER_STATUS,
  JOB_SMS_OTP,
  QUEUE_SMS,
  SmsOrderStatusPayloadSchema,
  SmsOtpPayloadSchema,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { SmsService } from '../sms/sms.service';

@Processor(QUEUE_SMS)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly sms: SmsService) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_SMS_OTP: {
        const payload = SmsOtpPayloadSchema.parse(job.data);
        await this.sms.send({
          to: payload.phone,
          body: `Your verification code is ${payload.code}. Expires in ${Math.floor(payload.expiresInSeconds / 60)} minutes.`,
        });
        return;
      }
      case JOB_SMS_ORDER_STATUS: {
        const payload = SmsOrderStatusPayloadSchema.parse(job.data);
        await this.sms.send({
          to: payload.phone,
          body: smsBody(payload.toStatus, payload.orderNumber),
        });
        return;
      }
      default:
        this.logger.warn(`Unknown sms job: ${job.name}`);
    }
  }
}

function smsBody(status: string, orderNumber: string): string {
  switch (status) {
    case 'CONFIRMED':
      return `Order ${orderNumber} confirmed. We are getting it ready.`;
    case 'OUT_FOR_DELIVERY':
      return `Order ${orderNumber} is out for delivery.`;
    default:
      return `Order ${orderNumber} is now ${status}.`;
  }
}
