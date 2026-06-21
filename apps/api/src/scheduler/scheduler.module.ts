import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_PUSH } from '@repo/jobs';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_PUSH })],
  providers: [SchedulerService],
})
export class SchedulerModule {}
