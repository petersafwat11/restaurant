import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_ORDERS, QUEUE_RECEIPT } from '@repo/jobs';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PricingModule } from '../pricing/pricing.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SettingsModule } from '../settings/settings.module';
import { IdempotencyService } from './idempotency.service';
import { OrderAutoCompleteProcessor } from './order-auto-complete.processor';
import { OrderNumberService } from './order-number';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    PromotionsModule,
    PricingModule,
    LoyaltyModule,
    SettingsModule,
    BullModule.registerQueue({ name: QUEUE_RECEIPT }, { name: QUEUE_ORDERS }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, IdempotencyService, OrderAutoCompleteProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
