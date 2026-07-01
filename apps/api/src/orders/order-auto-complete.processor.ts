import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOB_ORDER_AUTO_COMPLETE, OrderAutoCompletePayloadSchema, QUEUE_ORDERS } from '@repo/jobs';
import type { Job } from 'bullmq';
import { OrdersService } from './orders.service';

/**
 * Worker for the orders queue.
 *  - `order.auto-complete` (delayed by the post-delivery grace window) →
 *    archive a still-DELIVERED order to COMPLETED. The service re-reads the order
 *    and no-ops if it already moved on, so a stale/duplicate job is harmless.
 */
@Processor(QUEUE_ORDERS)
export class OrderAutoCompleteProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderAutoCompleteProcessor.name);

  constructor(private readonly orders: OrdersService) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_ORDER_AUTO_COMPLETE: {
        const { orderId } = OrderAutoCompletePayloadSchema.parse(job.data);
        await this.orders.autoCompleteDelivered(orderId);
        return;
      }
      default:
        this.logger.warn(`Unknown orders job: ${job.name}`);
    }
  }
}
