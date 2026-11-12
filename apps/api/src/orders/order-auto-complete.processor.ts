import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_ORDER_AUTO_COMPLETE,
  JOB_ORDER_REVIEW_REQUEST,
  OrderAutoCompletePayloadSchema,
  OrderReviewRequestPayloadSchema,
  QUEUE_ORDERS,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { OrdersService } from './orders.service';
import { ReviewRequestService } from './review-request.service';

/**
 * Worker for the orders queue.
 *  - `order.auto-complete` (delayed by the post-delivery grace window) →
 *    archive a still-DELIVERED order to COMPLETED. The service re-reads the order
 *    and no-ops if it already moved on, so a stale/duplicate job is harmless.
 *  - `order.review-request` (delayed ~60 min after hand-over) → one Google
 *    review request email; idempotent (see ReviewRequestService).
 */
@Processor(QUEUE_ORDERS)
export class OrderAutoCompleteProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderAutoCompleteProcessor.name);

  constructor(
    private readonly orders: OrdersService,
    private readonly reviewRequests: ReviewRequestService,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_ORDER_AUTO_COMPLETE: {
        const { orderId } = OrderAutoCompletePayloadSchema.parse(job.data);
        await this.orders.autoCompleteDelivered(orderId);
        return;
      }
      case JOB_ORDER_REVIEW_REQUEST: {
        const { orderId } = OrderReviewRequestPayloadSchema.parse(job.data);
        await this.reviewRequests.send(orderId);
        return;
      }
      default:
        this.logger.warn(`Unknown orders job: ${job.name}`);
    }
  }
}
