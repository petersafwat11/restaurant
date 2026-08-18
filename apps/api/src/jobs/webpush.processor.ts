import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_WEBPUSH_NEW_ORDER,
  JOB_WEBPUSH_PENDING_ORDER_REMINDER,
  QUEUE_WEBPUSH,
  WebPushNewOrderPayloadSchema,
  WebPushPendingOrderReminderPayloadSchema,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WebPushService } from '../webpush/webpush.service';

@Processor(QUEUE_WEBPUSH)
export class WebPushProcessor extends WorkerHost {
  private readonly logger = new Logger(WebPushProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    if (
      job.name !== JOB_WEBPUSH_NEW_ORDER &&
      job.name !== JOB_WEBPUSH_PENDING_ORDER_REMINDER
    ) {
      this.logger.warn(`Unknown webpush job: ${job.name}`);
      return;
    }

    const isReminder = job.name === JOB_WEBPUSH_PENDING_ORDER_REMINDER;
    const payload = isReminder
      ? WebPushPendingOrderReminderPayloadSchema.parse(job.data)
      : WebPushNewOrderPayloadSchema.parse(job.data);

    // If it's a reminder, verify that the order is still unacknowledged (PENDING or CONFIRMED) before sending!
    if (isReminder) {
      const order = await this.prisma.order.findUnique({
        where: { id: payload.orderId },
        select: { status: true },
      });
      if (!order || (order.status !== 'PENDING' && order.status !== 'CONFIRMED')) {
        this.logger.debug(
          `Skipping webpush reminder for order ${payload.orderNumber}: status is ${order?.status ?? 'missing'}`,
        );
        return;
      }
    }

    const subscription = await this.prisma.webPushSubscription.findFirst({
      where: {
        id: payload.subscriptionId,
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
      include: { user: { select: { locale: true } } },
    });
    if (!subscription) return;

    const locale = subscription.user.locale === 'en' ? 'en' : 'pl';
    const isEnglish = locale === 'en';
    const orderType = orderTypeLabel(payload.orderType, locale);
    const customer = payload.customerName ?? (isEnglish ? 'Guest' : 'Gość');
    const itemLabel = isEnglish
      ? `${payload.itemCount} item${payload.itemCount === 1 ? '' : 's'}`
      : `${payload.itemCount} szt.`;
    const localePrefix = isEnglish ? '/en' : '';
    const url = `${payload.adminBaseUrl.replace(/\/$/, '')}${localePrefix}/orders/${encodeURIComponent(payload.orderId)}`;

    const minutesPending = 'minutesPending' in payload ? payload.minutesPending : 5;
    const title = isReminder
      ? isEnglish
        ? `⚠️ URGENT: Order ${payload.orderNumber} still pending (${minutesPending}m)`
        : `⚠️ PILNE: Zamówienie ${payload.orderNumber} nadal oczekuje (${minutesPending} min)`
      : isEnglish
        ? `New order ${payload.orderNumber}`
        : `Nowe zamówienie ${payload.orderNumber}`;

    const body = isReminder
      ? isEnglish
        ? `${customer} · ${orderType} · ${itemLabel} · Action required on admin dashboard`
        : `${customer} · ${orderType} · ${itemLabel} · Wymagana reakcja w panelu`
      : `${customer} · ${orderType} · ${itemLabel} · ${payload.grandTotal} ${payload.currency}`;

    const result = await this.webPush.send(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      {
        title,
        body,
        url,
        tag: isReminder ? `order-${payload.orderId}-rem-${minutesPending}` : `order-${payload.orderId}`,
        icon: '/icons/admin-192.png',
        badge: '/icons/admin-notification-badge.png',
      },
    );

    if (result === 'expired') {
      await this.prisma.webPushSubscription.delete({ where: { id: subscription.id } });
    } else if (result === 'sent') {
      await this.prisma.webPushSubscription.update({
        where: { id: subscription.id },
        data: { lastUsedAt: new Date() },
      });
    }
  }
}

function orderTypeLabel(type: 'DELIVERY' | 'PICKUP' | 'DINE_IN', locale: 'en' | 'pl'): string {
  const labels = {
    en: { DELIVERY: 'Delivery', PICKUP: 'Pickup', DINE_IN: 'Dine in' },
    pl: { DELIVERY: 'Dostawa', PICKUP: 'Odbiór', DINE_IN: 'Na miejscu' },
  } as const;
  return labels[locale][type];
}
