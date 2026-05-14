import { Module } from '@nestjs/common';
import { CustomerSegmentsService } from './customer-segments.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerSegmentsService],
  exports: [CustomersService, CustomerSegmentsService],
})
export class CustomersModule {}
