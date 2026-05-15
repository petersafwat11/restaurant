import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  type Analytics,
  type AnalyticsEventName,
  type AnalyticsEventPayload,
  createAnalytics,
} from '@repo/analytics';
import type { OrderCreatedEvent, OrderStatusChangedEvent } from '@repo/types';
import { ENV, type ENV_TYPE } from '../config/config.module';

/**
 * Product analytics. Captures a small set of high-signal backend events.
 * Best-effort: capture failures never bubble into the request path. No-ops
 * when `POSTHOG_KEY` is empty (dev/test/CI).
 */
@Injectable()
export class AnalyticsProductService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsProductService.name);
  private readonly client: Analytics;

  constructor(@Inject(ENV) env: ENV_TYPE) {
    this.client = createAnalytics({
      key: env.POSTHOG_KEY,
      host: env.POSTHOG_HOST,
    });
  }

  capture<E extends AnalyticsEventName>(
    event: E,
    payload: AnalyticsEventPayload<E>,
  ): void {
    try {
      this.client.capture(event, payload);
    } catch (err) {
      this.logger.warn(`analytics capture ${event} failed: ${err}`);
    }
  }

  @OnEvent('order.created')
  onOrderCreated(e: OrderCreatedEvent): void {
    this.capture('order_placed', {
      userId: e.userId,
      orderId: e.orderId,
      grandTotal: e.grandTotal,
      currency: e.currency,
      type: e.type,
    });
  }

  @OnEvent('order.status_changed')
  onOrderStatusChanged(e: OrderStatusChangedEvent): void {
    // Order moves to CONFIRMED once payment is settled (Stripe webhook or
    // COD short-circuit) — the cleanest server-side "paid" signal.
    if (e.to === 'CONFIRMED') {
      this.capture('payment_succeeded', {
        userId: e.userId,
        orderId: e.orderId,
        amount: e.grandTotal,
        currency: e.currency,
        method: e.type,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.shutdown().catch(() => undefined);
  }
}
