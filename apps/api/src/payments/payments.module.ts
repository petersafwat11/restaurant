import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_RECONCILIATION } from '@repo/jobs';
import { OrdersModule } from '../orders/orders.module';
import { EserviceProvider } from './eservice.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhooksController } from './payments.webhooks.controller';
import { CodProvider } from './providers/cod.provider';
import { ReconciliationProcessor } from './reconciliation.processor';
import { WebhookEventsService } from './webhook-events.service';

// QUEUE_RECEIPT now lives in OrdersModule — the receipt enqueue moved into
// OrdersService.confirmPendingOrder, which PaymentsService delegates to.
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_EMAIL }, { name: QUEUE_RECONCILIATION }),
    OrdersModule,
  ],
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [
    PaymentsService,
    EserviceProvider,
    CodProvider,
    WebhookEventsService,
    ReconciliationProcessor,
  ],
  exports: [PaymentsService, EserviceProvider, CodProvider],
})
export class PaymentsModule {}
