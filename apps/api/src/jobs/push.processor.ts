import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_PUSH_ORDER_STATUS,
  JOB_PUSH_WELCOME,
  PushOrderStatusPayloadSchema,
  PushWelcomePayloadSchema,
  QUEUE_PUSH,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Push processor with real Expo SDK send. Reads device tokens from the
 * `PushToken` table per user and batches sends per Expo's docs.
 */
@Processor(QUEUE_PUSH)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async process(job: Job): Promise<void> {
    if (job.name === JOB_PUSH_WELCOME) {
      const payload = PushWelcomePayloadSchema.parse(job.data);
      await this.sendToUser(payload.userId, {
        title: 'Welcome!',
        body: `Hi ${payload.firstName ?? 'there'}, thanks for joining.`,
      });
      return;
    }

    if (job.name === JOB_PUSH_ORDER_STATUS) {
      const payload = PushOrderStatusPayloadSchema.parse(job.data);
      await this.sendToUser(payload.userId, {
        title: `Order ${payload.orderNumber}`,
        body: orderStatusBody(payload.toStatus),
        data: { orderId: payload.orderId, toStatus: payload.toStatus },
      });
      return;
    }

    this.logger.warn(`Unknown push job: ${job.name}`);
  }

  private async sendToUser(
    userId: string,
    content: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) {
      this.logger.log(`[push] no tokens for user ${userId}`);
      return;
    }

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default',
        title: content.title,
        body: content.body,
        data: content.data ?? {},
      }));

    if (messages.length === 0) {
      this.logger.warn(`[push] all tokens for user ${userId} were invalid Expo tokens`);
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        this.logger.warn(`[push] send failed: ${(err as Error).message}`);
      }
    }
  }
}

function orderStatusBody(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Payment received. We are getting your order ready.';
    case 'PREPARING':
      return 'The kitchen has started on your order.';
    case 'READY':
      return 'Your order is ready for pickup.';
    case 'OUT_FOR_DELIVERY':
      return 'Your order is on the way.';
    case 'DELIVERED':
      return 'Your order has been delivered. Enjoy!';
    case 'CANCELLED':
      return 'Your order has been cancelled.';
    case 'REFUNDED':
      return 'A refund has been issued for your order.';
    default:
      return `Status updated to ${status}.`;
  }
}
