import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_SMS, QUEUE_WEBPUSH } from '@repo/jobs';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { StaffOrderAlertService } from './staff-order-alert.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_SMS }, { name: QUEUE_WEBPUSH }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationDispatcherService, NotificationsService, StaffOrderAlertService],
  exports: [NotificationDispatcherService, NotificationsService],
})
export class NotificationsModule {}
