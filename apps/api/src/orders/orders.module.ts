import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_RECEIPT } from '@repo/jobs';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PricingModule } from '../pricing/pricing.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SettingsModule } from '../settings/settings.module';
import { IdempotencyService } from './idempotency.service';
import { OrderNumberService } from './order-number';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    PromotionsModule,
    PricingModule,
    LoyaltyModule,
    SettingsModule,
    BullModule.registerQueue({ name: QUEUE_RECEIPT }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderNumberService, IdempotencyService],
  exports: [OrdersService],
})
export class OrdersModule {}
