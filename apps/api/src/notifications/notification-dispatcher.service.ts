import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  JOB_EMAIL_ORDER_STATUS,
  JOB_PUSH_ORDER_STATUS,
  JOB_SMS_ORDER_STATUS,
  QUEUE_EMAIL,
  QUEUE_PUSH,
  QUEUE_SMS,
} from '@repo/jobs';
import type { OrderCreatedEvent, OrderStatusChangedEvent } from '@repo/types';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { channelsForStatus, notificationCopyFor } from './notification-matrix';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue,
  ) {}

  // ---- Event subscribers --------------------------------------------------

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.dispatch({
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      userId: event.userId,
      from: 'PENDING', // first state
      to: 'PENDING',
    });
  }

  @OnEvent('order.status_changed')
  async onOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await this.dispatch({
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      userId: event.userId,
      from: event.from,
      to: event.to,
    });
  }

  // ---- Dispatch -----------------------------------------------------------

  private async dispatch(input: {
    orderId: string;
    orderNumber: string;
    userId: string | null;
    from: import('@repo/types').OrderStatus;
    to: import('@repo/types').OrderStatus;
  }): Promise<void> {
    const channels = channelsForStatus(input.to);
    if (
      !channels.email &&
      !channels.sms &&
      !channels.push &&
      !channels.inApp
    ) {
      return;
    }

    // Look up the customer so we have email/phone/userId to address by.
    const user = input.userId
      ? await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, email: true, phone: true },
        })
      : null;

    // Per-user channel opt-outs (Sprint 9). In-app is never gated; the feed is
    // the user's source of truth. Missing row → defaults (order updates on).
    const prefs = user
      ? await this.prisma.notificationPreference.findUnique({
          where: { userId: user.id },
        })
      : null;
    const allowEmail = prefs ? prefs.orderUpdatesEmail : true;
    const allowSms = prefs ? prefs.orderUpdatesSms : true;
    const allowPush = prefs ? prefs.orderUpdatesPush : true;

    const copy = notificationCopyFor(input.to, input.orderNumber);

    // In-app notification — persist directly, no queue.
    if (channels.inApp && user) {
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'order_status',
          title: copy.title,
          body: copy.body,
          data: { orderId: input.orderId, toStatus: input.to } as never,
        },
      });
    }

    if (channels.email && allowEmail && user?.email) {
      await this.emailQueue.add(JOB_EMAIL_ORDER_STATUS, {
        orderId: input.orderId,
        userId: user.id,
        to: user.email,
        orderNumber: input.orderNumber,
        fromStatus: input.from,
        toStatus: input.to,
      });
    }

    if (channels.sms && allowSms && user?.phone) {
      await this.smsQueue.add(JOB_SMS_ORDER_STATUS, {
        orderId: input.orderId,
        userId: user.id,
        phone: user.phone,
        orderNumber: input.orderNumber,
        toStatus: input.to,
      });
    }

    if (channels.push && allowPush && user) {
      await this.pushQueue.add(JOB_PUSH_ORDER_STATUS, {
        orderId: input.orderId,
        userId: user.id,
        orderNumber: input.orderNumber,
        toStatus: input.to,
      });
    }

    this.logger.log(
      `Dispatched order-status notifications for ${input.orderNumber} → ${input.to}`,
    );
  }
}
