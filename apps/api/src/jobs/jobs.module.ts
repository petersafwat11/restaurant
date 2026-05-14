import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  QUEUE_ANALYTICS,
  QUEUE_AUDIT,
  QUEUE_EMAIL,
  QUEUE_PUSH,
  QUEUE_R2_CLEANUP,
  QUEUE_RECEIPT,
  QUEUE_REPORTS,
  QUEUE_SMS,
} from '@repo/jobs';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MailerModule } from '../mailer/mailer.module';
import { ReportsModule } from '../reports/reports.module';
import { SmsModule } from '../sms/sms.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AnalyticsProcessor } from './analytics.processor';
import { AuditProcessor } from './audit.processor';
import { EmailProcessor } from './email.processor';
import { PushProcessor } from './push.processor';
import { R2OrphanCleanupProcessor } from './r2-orphan-cleanup.processor';
import { ReceiptProcessor } from './receipt.processor';
import { ReportsProcessor } from './reports.processor';
import { SmsProcessor } from './sms.processor';

@Module({
  imports: [
    MailerModule,
    SmsModule,
    AnalyticsModule,
    ReportsModule,
    UploadsModule,
    // Re-register queues so processors can inject them. BullModule treats
    // duplicate registrations as a no-op past the first.
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_SMS },
      { name: QUEUE_PUSH },
      { name: QUEUE_RECEIPT },
      { name: QUEUE_REPORTS },
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_AUDIT },
      { name: QUEUE_R2_CLEANUP },
    ),
  ],
  providers: [
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    ReceiptProcessor,
    ReportsProcessor,
    AnalyticsProcessor,
    AuditProcessor,
    R2OrphanCleanupProcessor,
  ],
})
export class JobsModule {}
