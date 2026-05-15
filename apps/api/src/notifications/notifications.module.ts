import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_PUSH, QUEUE_SMS } from '@repo/jobs';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_SMS }, { name: QUEUE_PUSH }),
  ],
  providers: [NotificationDispatcherService],
  exports: [NotificationDispatcherService],
})
export class NotificationsModule {}
