import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_RECEIPT } from '@repo/jobs';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments.webhooks.controller';
import { CodProvider } from './providers/cod.provider';
import { StripeProvider } from './providers/stripe.provider';
import { WebhookEventsService } from './webhook-events.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_RECEIPT }, { name: QUEUE_EMAIL }), OrdersModule],
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [PaymentsService, StripeProvider, CodProvider, WebhookEventsService],
  exports: [PaymentsService, StripeProvider, CodProvider],
})
export class PaymentsModule {}
