import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL } from '@repo/jobs';
import { CustomerSegmentsService } from './customer-segments.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerSegmentsService],
  exports: [CustomersService, CustomerSegmentsService],
})
export class CustomersModule {}
