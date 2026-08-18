import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JOB_WEBPUSH_NEW_ORDER, JOB_WEBPUSH_PENDING_ORDER_REMINDER, QUEUE_WEBPUSH } from '@repo/jobs';
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
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              permissions: { some: { permission: { key: 'order:read' } } },
            },
          },
        },
      },
      select: {
        id: true,
        locale: true,
        webPushSubscriptions: { select: { id: true } },
      },
    });

    await Promise.all(
      staff.map(async (user) => {
        const isEnglish = user.locale === 'en';
        const notification = await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'new_order',
            title: isEnglish
              ? `New order ${event.orderNumber}`
              : `Nowe zamówienie ${event.orderNumber}`,
            body: newOrderBody(event, isEnglish ? 'en' : 'pl'),
            data: {
              orderId: event.orderId,
              orderNumber: event.orderNumber,
              orderType: event.type,
            },
          },
        });

        this.events.emit('notification.created', {
          userId: user.id,
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }),
    );

    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = staff.flatMap((user) => user.webPushSubscriptions);
    await Promise.all(
      subscriptions.flatMap(({ id: subscriptionId }) => {
        const basePayload = {
          subscriptionId,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          orderType: event.type,
          itemCount: event.itemCount,
          currency: event.currency,
          grandTotal: event.grandTotal,
          customerName: event.customerName,
          adminBaseUrl: this.env.APP_URL_ADMIN,
        };

        return [
          // 1. Immediate Web Push alert
          this.webPushQueue.add(JOB_WEBPUSH_NEW_ORDER, basePayload, {
            jobId: `${event.orderId}-${subscriptionId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: 500,
            removeOnFail: 1_000,
          }),
          // 2. 5-minute delayed reminder if order remains pending
          this.webPushQueue.add(
            JOB_WEBPUSH_PENDING_ORDER_REMINDER,
            { ...basePayload, minutesPending: 5 },
            {
              jobId: `${event.orderId}-reminder-5m-${subscriptionId}`,
              delay: 5 * 60_000,
              attempts: 2,
              removeOnComplete: 500,
              removeOnFail: 1_000,
            },
          ),
          // 3. 10-minute delayed reminder if order remains pending
          this.webPushQueue.add(
            JOB_WEBPUSH_PENDING_ORDER_REMINDER,
            { ...basePayload, minutesPending: 10 },
            {
              jobId: `${event.orderId}-reminder-10m-${subscriptionId}`,
              delay: 10 * 60_000,
              attempts: 2,
              removeOnComplete: 500,
              removeOnFail: 1_000,
            },
          ),
        ];
      }),
    );

    if (subscriptions.length > 0) {
      this.logger.log(
        `Queued ${subscriptions.length} staff Web Push alert(s) and reminders for ${event.orderNumber}`,
      );
    }
  }
}

function newOrderBody(event: OrderCreatedEvent, locale: 'en' | 'pl'): string {
  const isEnglish = locale === 'en';
  const customer = event.customerName ?? (isEnglish ? 'Guest' : 'Gość');
  const orderType = {
    en: { DELIVERY: 'Delivery', PICKUP: 'Pickup', DINE_IN: 'Dine in' },
    pl: { DELIVERY: 'Dostawa', PICKUP: 'Odbiór', DINE_IN: 'Na miejscu' },
  }[locale][event.type];
  const items = isEnglish
    ? `${event.itemCount} item${event.itemCount === 1 ? '' : 's'}`
    : `${event.itemCount} szt.`;

  return `${customer} · ${orderType} · ${items} · ${event.grandTotal} ${event.currency}`;
}
