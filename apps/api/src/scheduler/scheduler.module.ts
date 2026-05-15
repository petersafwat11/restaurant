import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_ANALYTICS, QUEUE_PUSH, QUEUE_REPORTS } from '@repo/jobs';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_PUSH },
      { name: QUEUE_ANALYTICS },
      { name: QUEUE_REPORTS },
    ),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
