import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import {
  JOB_PUSH_LOYALTY,
  JOB_PUSH_ORDER_STATUS,
  JOB_PUSH_TOKEN_CLEANUP,
  JOB_PUSH_WELCOME,
  PushLoyaltyPayloadSchema,
  PushOrderStatusPayloadSchema,
  PushTokenCleanupPayloadSchema,
  PushWelcomePayloadSchema,
  QUEUE_PUSH,
} from '@repo/jobs';
import { orderDeepLink } from '@repo/utils';
import type { Job } from 'bullmq';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_STALE_DAYS = 60;

/**
 * Push processor with real Expo SDK send. Reads device tokens from the
 * `PushToken` table per user and batches sends per Expo's docs. Invalid tokens
 * reported by Expo (`DeviceNotRegistered`) are pruned inline; a daily cleanup
 * job is the belt-and-suspenders for tokens that simply went stale.
 */
@Processor(QUEUE_PUSH)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);
  private readonly expo = new Expo();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: ENV_TYPE,
  ) {
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
        data: {
          orderId: payload.orderId,
          toStatus: payload.toStatus,
          url: orderDeepLink(payload.orderId, this.env.APP_DEEP_LINK_SCHEME),
        },
      });
      return;
    }

    if (job.name === JOB_PUSH_LOYALTY) {
      const payload = PushLoyaltyPayloadSchema.parse(job.data);
      const title =
        payload.reason === 'REFERRAL' ? 'Referral reward' : 'Points earned';
      await this.sendToUser(payload.userId, {
        title,
        body: `You earned ${payload.points} loyalty points.`,
        data: { type: 'loyalty', points: payload.points },
      });
      return;
    }

    if (job.name === JOB_PUSH_TOKEN_CLEANUP) {
      const { staleDays } = PushTokenCleanupPayloadSchema.parse(job.data ?? {});
      await this.cleanupStaleTokens(staleDays ?? DEFAULT_STALE_DAYS);
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

    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.token));
    const messages: ExpoPushMessage[] = valid.map((t) => ({
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
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
      try {
        const res = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...res);
      } catch (err) {
        this.logger.warn(`[push] send failed: ${(err as Error).message}`);
      }
    }

    await this.reconcileTickets(
      valid.map((t) => t.token),
      tickets,
    );
  }

  /**
   * Tickets line up with messages by index. A `DeviceNotRegistered` error
   * means the token is dead — delete it so we stop wasting sends. Successful
   * sends bump `lastUsedAt` so the stale-token sweep keeps live devices.
   */
  private async reconcileTickets(
    orderedTokens: string[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    const dead: string[] = [];
    const alive: string[] = [];
    tickets.forEach((ticket, i) => {
      const token = orderedTokens[i];
      if (!token) return;
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        dead.push(token);
      } else if (ticket.status === 'ok') {
        alive.push(token);
      }
    });

    if (dead.length > 0) {
      await this.prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      this.logger.log(`[push] pruned ${dead.length} unregistered token(s)`);
    }
    if (alive.length > 0) {
      await this.prisma.pushToken.updateMany({
        where: { token: { in: alive } },
        data: { lastUsedAt: new Date() },
      });
    }
  }

  private async cleanupStaleTokens(staleDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const res = await this.prisma.pushToken.deleteMany({
      where: {
        OR: [
          { lastUsedAt: { lt: cutoff } },
          { lastUsedAt: null, createdAt: { lt: cutoff } },
        ],
      },
    });
    this.logger.log(`[push] stale-token sweep removed ${res.count} token(s)`);
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
