import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JOB_WEBPUSH_NEW_ORDER, QUEUE_WEBPUSH } from '@repo/jobs';
import type { OrderCreatedEvent } from '@repo/types';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffOrderAlertService {
  private readonly logger = new Logger(StaffOrderAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: ENV_TYPE,
    @InjectQueue(QUEUE_WEBPUSH) private readonly webPushQueue: Queue,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await this.prisma.webPushSubscription.findMany({
      where: {
        user: {
          isActive: true,
          roles: {
            some: {
              role: {
                permissions: { some: { permission: { key: 'order:read' } } },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    await Promise.all(
      subscriptions.map(({ id: subscriptionId }) =>
        this.webPushQueue.add(
          JOB_WEBPUSH_NEW_ORDER,
          {
            subscriptionId,
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            orderType: event.type,
            itemCount: event.itemCount,
            currency: event.currency,
            grandTotal: event.grandTotal,
            customerName: event.customerName,
            adminBaseUrl: this.env.APP_URL_ADMIN,
          },
          {
            jobId: `${event.orderId}-${subscriptionId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: 500,
            removeOnFail: 1_000,
          },
        ),
      ),
    );

    if (subscriptions.length > 0) {
      this.logger.log(
        `Queued ${subscriptions.length} staff Web Push alert(s) for ${event.orderNumber}`,
      );
    }
  }
}
