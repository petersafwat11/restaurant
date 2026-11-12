import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOB_ORDER_REVIEW_REQUEST, QUEUE_ORDERS, REVIEW_REQUEST_DELAY_MS } from '@repo/jobs';
import type { OrderStatus, OrderType } from '@repo/types';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { MailerService } from '../mailer/mailer.service';
import { renderReviewRequest } from '../mailer/templates/review-request';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Post-order Google review request.
 *
 * When an order is handed over — DELIVERED for delivery, COMPLETED for pickup
 * / dine-in — a delayed job (~60 min) emails the customer one neutral
 * "review us on Google" message. Google policy: every customer is asked the
 * same way; no incentives, no satisfaction filter, no pre-written text.
 *
 * Guarantees:
 * - at most one email per order: deterministic BullMQ jobId + an atomic
 *   `reviewRequestSentAt` claim in the DB (survives re-enqueues / retries);
 * - skipped when there is no email, the order was cancelled/refunded, no
 *   review link is configured, or the customer opted out (signed-in users via
 *   `NotificationPreference.orderUpdatesEmail`; any address that unsubscribed
 *   from our emails via the newsletter);
 * - mail transport missing → logged and skipped (never crashes the worker);
 *   send failure → claim released and error rethrown so BullMQ retries.
 */

export type ReviewRequestOutcome =
  | 'sent'
  | 'not-found'
  | 'already-sent'
  | 'not-eligible-status'
  | 'no-email'
  | 'no-review-url'
  | 'opted-out'
  | 'mail-not-configured';

/** Statuses after which the order was handed to the customer. */
export function isReviewTrigger(type: OrderType, to: OrderStatus): boolean {
  return type === 'DELIVERY' ? to === 'DELIVERED' : to === 'COMPLETED';
}

const ELIGIBLE_STATUSES: OrderStatus[] = ['DELIVERED', 'COMPLETED'];

export function reviewRequestJobId(orderId: string): string {
  return `order-review-request:${orderId}`;
}

@Injectable()
export class ReviewRequestService {
  private readonly logger = new Logger(ReviewRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    @Inject(ENV) private readonly env: ENV_TYPE,
    @InjectQueue(QUEUE_ORDERS) private readonly ordersQueue: Queue,
  ) {}

  /**
   * Schedule the review request for an order that just reached `to`. No-op for
   * non-trigger transitions. Best-effort: a scheduling failure is logged and
   * never fails the status transition.
   */
  async scheduleFor(orderId: string, type: OrderType, to: OrderStatus): Promise<boolean> {
    if (!isReviewTrigger(type, to)) return false;
    try {
      await this.ordersQueue.add(
        JOB_ORDER_REVIEW_REQUEST,
        { orderId },
        {
          delay: REVIEW_REQUEST_DELAY_MS,
          jobId: reviewRequestJobId(orderId),
          attempts: 3,
          backoff: { type: 'exponential', delay: 5 * 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      return true;
    } catch (err) {
      this.logger.error(`failed to schedule review request for order ${orderId}: ${err}`);
      return false;
    }
  }

  /** Worker entry point. Re-checks everything; safe on stale / duplicate jobs. */
  async send(orderId: string): Promise<ReviewRequestOutcome> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        userId: true,
        customerName: true,
        customerEmail: true,
        checkoutLocale: true,
        reviewRequestSentAt: true,
      },
    });
    if (!order) return this.skip(orderId, 'not-found');
    if (order.reviewRequestSentAt) return this.skip(orderId, 'already-sent');
    // Cancelled / refunded (or never handed over) → never ask for a review.
    if (!ELIGIBLE_STATUSES.includes(order.status as OrderStatus)) {
      return this.skip(orderId, 'not-eligible-status');
    }

    const user = order.userId
      ? await this.prisma.user.findUnique({
          where: { id: order.userId },
          select: { email: true, firstName: true, locale: true },
        })
      : null;
    const to = order.customerEmail ?? user?.email ?? null;
    if (!to) return this.skip(orderId, 'no-email');

    const restaurant = await this.prisma.restaurant.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { googleReviewUrl: true },
    });
    const reviewUrl = restaurant?.googleReviewUrl?.trim();
    if (!reviewUrl) return this.skip(orderId, 'no-review-url');

    if (await this.hasOptedOut(order.userId, to)) return this.skip(orderId, 'opted-out');

    if (!this.mailer.isConfigured()) {
      this.logger.warn(`review request for ${order.orderNumber} skipped: no mail transport`);
      return 'mail-not-configured';
    }

    // Atomic claim: only one worker/attempt can flip null → now.
    const claim = await this.prisma.order.updateMany({
      where: { id: order.id, reviewRequestSentAt: null },
      data: { reviewRequestSentAt: new Date() },
    });
    if (claim.count === 0) return this.skip(orderId, 'already-sent');

    const locale = (order.checkoutLocale ?? user?.locale) === 'en' ? 'en' : 'pl';
    const base = this.env.APP_URL_WEB.replace(/\/+$/, '');
    const firstName = user?.firstName ?? order.customerName?.split(/\s+/)[0] ?? null;
    try {
      const { subject, html, text } = await renderReviewRequest({
        locale,
        orderNumber: order.orderNumber,
        firstName,
        reviewUrl,
        preferencesUrl: order.userId
          ? `${base}${locale === 'en' ? '/en' : ''}/account/notifications`
          : null,
      });
      await this.mailer.send({ to, subject, html, text });
    } catch (err) {
      // Release the claim so a BullMQ retry can try again, then surface it.
      await this.prisma.order
        .updateMany({ where: { id: order.id }, data: { reviewRequestSentAt: null } })
        .catch(() => undefined);
      this.logger.error(`review request for ${order.orderNumber} failed: ${err}`);
      throw err;
    }
    this.logger.log(`review request sent for ${order.orderNumber}`);
    return 'sent';
  }

  private async hasOptedOut(userId: string | null, email: string): Promise<boolean> {
    if (userId) {
      const prefs = await this.prisma.notificationPreference.findUnique({
        where: { userId },
        select: { orderUpdatesEmail: true },
      });
      if (prefs && !prefs.orderUpdatesEmail) return true;
    }
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
      select: { status: true },
    });
    return sub?.status === 'UNSUBSCRIBED';
  }

  private skip(orderId: string, reason: ReviewRequestOutcome): ReviewRequestOutcome {
    this.logger.log(`review request for order ${orderId} skipped: ${reason}`);
    return reason;
  }
}
