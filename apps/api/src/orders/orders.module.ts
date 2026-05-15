import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PricingModule } from '../pricing/pricing.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { IdempotencyService } from './idempotency.service';
import { OrderNumberService } from './order-number';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PromotionsModule, PricingModule, LoyaltyModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, IdempotencyService],
  exports: [OrdersService],
})
export class OrdersModule {}
