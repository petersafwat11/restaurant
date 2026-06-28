import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_ANALYTICS, QUEUE_AUDIT, QUEUE_EMAIL, QUEUE_RECEIPT, QUEUE_SMS } from '@repo/jobs';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MailerModule } from '../mailer/mailer.module';
import { SmsModule } from '../sms/sms.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AnalyticsProcessor } from './analytics.processor';
import { AuditProcessor } from './audit.processor';
import { EmailProcessor } from './email.processor';
import { ReceiptProcessor } from './receipt.processor';
import { SmsProcessor } from './sms.processor';

@Module({
  imports: [
    MailerModule,
    SmsModule,
    AnalyticsModule,
    UploadsModule,
    // Re-register queues so processors can inject them. BullModule treats
    // duplicate registrations as a no-op past the first.
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_SMS },
      { name: QUEUE_RECEIPT },
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_AUDIT },
    ),
  ],
  providers: [EmailProcessor, SmsProcessor, ReceiptProcessor, AnalyticsProcessor, AuditProcessor],
})
export class JobsModule {}
