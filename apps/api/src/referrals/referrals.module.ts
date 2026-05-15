import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_PUSH } from '@repo/jobs';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [LoyaltyModule, BullModule.registerQueue({ name: QUEUE_PUSH })],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
