import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_EMAIL } from '@repo/jobs';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
