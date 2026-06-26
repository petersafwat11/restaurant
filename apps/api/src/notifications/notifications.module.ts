import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import {
  QUEUE_EMAIL,
  QUEUE_PUSH,
  QUEUE_SMS,
  QUEUE_WEBPUSH,
  QUEUE_WHATSAPP,
} from '@repo/jobs';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { StaffOrderAlertService } from './staff-order-alert.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_SMS },
      { name: QUEUE_PUSH },
      { name: QUEUE_WHATSAPP },
      { name: QUEUE_WEBPUSH },
    ),
  ],
  controllers: [NotificationsController],
  providers: [NotificationDispatcherService, NotificationsService, StaffOrderAlertService],
  exports: [NotificationDispatcherService, NotificationsService],
})
export class NotificationsModule {}
