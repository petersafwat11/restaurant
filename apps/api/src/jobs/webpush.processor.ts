import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOB_WEBPUSH_NEW_ORDER, QUEUE_WEBPUSH, WebPushNewOrderPayloadSchema } from '@repo/jobs';
import type { Job } from 'bullmq';
import { newOrderAlertText } from '../notifications/new-order-alert-copy';
import { PrismaService } from '../prisma/prisma.service';
import { WebPushService } from '../webpush/webpush.service';

@Processor(QUEUE_WEBPUSH)
export class WebPushProcessor extends WorkerHost {
  private readonly logger = new Logger(WebPushProcessor.name);

  constructor(
    private readonly webpush: WebPushService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    if (job.name !== JOB_WEBPUSH_NEW_ORDER) {
      this.logger.warn(`Unknown webpush job: ${job.name}`);
      return;
    }

    const payload = WebPushNewOrderPayloadSchema.parse(job.data);
    const subs = await this.prisma.webPushSubscription.findMany({
      where: { userId: { in: payload.userIds } },
    });
    if (subs.length === 0) return;

    const notification = {
      title: 'New order',
      body: newOrderAlertText(payload),
      url: payload.adminUrl,
      tag: `order-${payload.orderId}`,
    };

    const expiredIds: string[] = [];
    const liveIds: string[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        const res = await this.webpush.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          notification,
        );
        if (res.expired) expiredIds.push(sub.id);
        else if (res.ok) liveIds.push(sub.id);
      }),
    );

    // Prune dead subscriptions; refresh lastUsedAt for the ones that delivered.
    if (expiredIds.length) {
      await this.prisma.webPushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
    }
    if (liveIds.length) {
      await this.prisma.webPushSubscription.updateMany({
        where: { id: { in: liveIds } },
        data: { lastUsedAt: new Date() },
      });
    }
  }
}
