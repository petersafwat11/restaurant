import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  JOB_SMS_NEW_ORDER,
  JOB_WEBPUSH_NEW_ORDER,
  JOB_WHATSAPP_NEW_ORDER,
  type NewOrderAlertSummary,
  QUEUE_SMS,
  QUEUE_WEBPUSH,
  QUEUE_WHATSAPP,
} from '@repo/jobs';
import type { OrderCreatedEvent } from '@repo/types';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

/** Roles whose holders manage incoming orders and may receive web-push alerts. */
const STAFF_ROLE_KEYS = ['owner', 'manager', 'kitchen', 'cashier'];

function parseList(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge configured + env-fallback recipients, de-duplicated. */
function mergeRecipients(configured: string[], fallbackCsv: string): string[] {
  return Array.from(new Set([...configured, ...parseList(fallbackCsv)]));
}

/**
 * Owner/staff "a customer placed an order" alerts. Sibling to
 * {@link NotificationDispatcherService} (which targets the customer); this one
 * targets the restaurant. Listens on `order.created` and fans out to SMS,
 * WhatsApp and admin web-push through the existing BullMQ queues, driven by the
 * Restaurant row's `orderAlert*` config (with env fallback for first bring-up).
 */
@Injectable()
export class StaffOrderAlertService {
  private readonly logger = new Logger(StaffOrderAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: ENV_TYPE,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_WHATSAPP) private readonly whatsappQueue: Queue,
    @InjectQueue(QUEUE_WEBPUSH) private readonly webpushQueue: Queue,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: {
        orderAlertSmsEnabled: true,
        orderAlertWhatsAppEnabled: true,
        orderAlertWebPushEnabled: true,
        orderAlertPhones: true,
        orderAlertWhatsApp: true,
      },
    });

    const smsEnabled = restaurant?.orderAlertSmsEnabled ?? false;
    const whatsAppEnabled = restaurant?.orderAlertWhatsAppEnabled ?? false;
    const webPushEnabled = restaurant?.orderAlertWebPushEnabled ?? true;

    const summary: NewOrderAlertSummary = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      orderType: event.type,
      itemCount: event.itemCount,
      currency: event.currency,
      grandTotal: event.grandTotal,
      customerName: event.customerName,
      adminUrl: `${this.env.APP_URL_ADMIN}/orders/${event.orderId}`,
    };

    const tasks: Promise<unknown>[] = [];

    if (smsEnabled) {
      const phones = mergeRecipients(restaurant?.orderAlertPhones ?? [], this.env.ORDER_ALERT_SMS_TO);
      for (const phone of phones) {
        tasks.push(this.smsQueue.add(JOB_SMS_NEW_ORDER, { ...summary, phone }));
      }
    }

    if (whatsAppEnabled) {
      const phones = mergeRecipients(
        restaurant?.orderAlertWhatsApp ?? [],
        this.env.ORDER_ALERT_WHATSAPP_TO,
      );
      for (const phone of phones) {
        tasks.push(this.whatsappQueue.add(JOB_WHATSAPP_NEW_ORDER, { ...summary, phone }));
      }
    }

    if (webPushEnabled) {
      const staff = await this.prisma.user.findMany({
        where: {
          isActive: true,
          roles: { some: { role: { key: { in: STAFF_ROLE_KEYS } } } },
          webPushSubscriptions: { some: {} },
        },
        select: { id: true },
      });
      const userIds = staff.map((u) => u.id);
      if (userIds.length > 0) {
        tasks.push(this.webpushQueue.add(JOB_WEBPUSH_NEW_ORDER, { ...summary, userIds }));
      }
    }

    if (tasks.length === 0) {
      this.logger.debug(`No staff alert channels active for order ${event.orderNumber}`);
      return;
    }

    await Promise.all(tasks);
    this.logger.log(
      `Dispatched ${tasks.length} staff alert(s) for new order ${event.orderNumber}`,
    );
  }
}
