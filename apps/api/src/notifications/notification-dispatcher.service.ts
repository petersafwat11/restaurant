import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
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
import { channelsForStatus, type Locale, notificationCopyFor } from './notification-matrix';

function pickLocale(stored: string | null | undefined): Locale {
  return stored === 'en' ? 'en' : 'pl';
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.dispatch({
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      userId: event.userId,
      from: 'PENDING',
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

    const user = input.userId
      ? await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, email: true, phone: true, locale: true },
        })
      : null;

    const prefs = user
      ? await this.prisma.notificationPreference.findUnique({
          where: { userId: user.id },
        })
      : null;
    const allowEmail = prefs ? prefs.orderUpdatesEmail : true;
    const allowSms = prefs ? prefs.orderUpdatesSms : true;
    const allowPush = prefs ? prefs.orderUpdatesPush : true;

    const locale = pickLocale(user?.locale);
    const copy = notificationCopyFor(this.i18n, input.to, input.orderNumber, locale);

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
