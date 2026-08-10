import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOB_WEBPUSH_NEW_ORDER, QUEUE_WEBPUSH, WebPushNewOrderPayloadSchema } from '@repo/jobs';
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
    if (job.name !== JOB_WEBPUSH_NEW_ORDER) {
      this.logger.warn(`Unknown webpush job: ${job.name}`);
      return;
    }

    const payload = WebPushNewOrderPayloadSchema.parse(job.data);
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

    const result = await this.webPush.send(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      {
        title: isEnglish
          ? `New order ${payload.orderNumber}`
          : `Nowe zamówienie ${payload.orderNumber}`,
        body: `${customer} · ${orderType} · ${itemLabel} · ${payload.grandTotal} ${payload.currency}`,
        url,
        tag: `order-${payload.orderId}`,
        icon: '/icons/admin-192.png',
        badge: '/icons/admin-192.png',
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
