import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  QUEUE_ANALYTICS,
  QUEUE_AUDIT,
  QUEUE_EMAIL,
  QUEUE_RECEIPT,
  QUEUE_SMS,
  QUEUE_WEBPUSH,
} from '@repo/jobs';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MailerModule } from '../mailer/mailer.module';
import { SmsModule } from '../sms/sms.module';
import { UploadsModule } from '../uploads/uploads.module';
import { WebPushModule } from '../webpush/webpush.module';
import { AnalyticsProcessor } from './analytics.processor';
import { AuditProcessor } from './audit.processor';
import { EmailProcessor } from './email.processor';
import { ReceiptProcessor } from './receipt.processor';
import { SmsProcessor } from './sms.processor';
import { WebPushProcessor } from './webpush.processor';

@Module({
  imports: [
    MailerModule,
    SmsModule,
    AnalyticsModule,
    UploadsModule,
    WebPushModule,
    // Re-register queues so processors can inject them. BullModule treats
    // duplicate registrations as a no-op past the first.
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_SMS },
      { name: QUEUE_RECEIPT },
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_AUDIT },
      { name: QUEUE_WEBPUSH },
    ),
  ],
  providers: [
    EmailProcessor,
    SmsProcessor,
    ReceiptProcessor,
    AnalyticsProcessor,
    AuditProcessor,
    WebPushProcessor,
  ],
})
export class JobsModule {}
