import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_PUSH, QUEUE_SMS } from '@repo/jobs';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_SMS }, { name: QUEUE_PUSH }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationDispatcherService, NotificationsService],
  exports: [NotificationDispatcherService, NotificationsService],
})
export class NotificationsModule {}
