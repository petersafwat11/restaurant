import {
  JOB_SMS_NEW_ORDER,
  JOB_WEBPUSH_NEW_ORDER,
  JOB_WHATSAPP_NEW_ORDER,
} from '@repo/jobs';
import type { OrderCreatedEvent } from '@repo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Keep the suite hermetic: don't load the real env (createEnv) or the generated
// Prisma client when importing the service under test.
vi.mock('../config/config.module', () => ({ ENV: Symbol('ENV') }));
vi.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { StaffOrderAlertService } from './staff-order-alert.service';

const EVENT: OrderCreatedEvent = {
  orderId: 'ord_1',
  orderNumber: 'R-2026-000123',
  userId: null,
  status: 'PENDING',
  type: 'DELIVERY',
  grandTotal: '84.50',
  currency: 'PLN',
  itemCount: 3,
  customerName: 'Jan K.',
  createdAt: '2026-06-26T10:00:00.000Z',
};

const ENV_BASE = {
  APP_URL_ADMIN: 'https://admin.example.com',
  ORDER_ALERT_SMS_TO: '',
  ORDER_ALERT_WHATSAPP_TO: '',
} as never;

function makeService(opts: {
  restaurant: Record<string, unknown> | null;
  staffWithSubs?: { id: string }[];
  env?: Record<string, unknown>;
}) {
  const smsQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const whatsappQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const webpushQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    restaurant: { findFirst: vi.fn().mockResolvedValue(opts.restaurant) },
    user: { findMany: vi.fn().mockResolvedValue(opts.staffWithSubs ?? []) },
  };
  const service = new StaffOrderAlertService(
    prisma as never,
    { ...ENV_BASE, ...(opts.env ?? {}) } as never,
    smsQueue as never,
    whatsappQueue as never,
    webpushQueue as never,
  );
  return { service, smsQueue, whatsappQueue, webpushQueue, prisma };
}

describe('StaffOrderAlertService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enqueues one SMS per configured phone when SMS alerts are on', async () => {
    const { service, smsQueue, whatsappQueue } = makeService({
      restaurant: {
        orderAlertSmsEnabled: true,
        orderAlertWhatsAppEnabled: false,
        orderAlertWebPushEnabled: false,
        orderAlertPhones: ['+48600100200', '+48600100201'],
        orderAlertWhatsApp: [],
      },
    });

    await service.onOrderCreated(EVENT);

    expect(smsQueue.add).toHaveBeenCalledTimes(2);
    expect(smsQueue.add).toHaveBeenCalledWith(
      JOB_SMS_NEW_ORDER,
      expect.objectContaining({ phone: '+48600100200', orderNumber: 'R-2026-000123' }),
    );
    expect(whatsappQueue.add).not.toHaveBeenCalled();
  });

  it('merges env-fallback recipients and de-duplicates', async () => {
    const { service, whatsappQueue } = makeService({
      restaurant: {
        orderAlertSmsEnabled: false,
        orderAlertWhatsAppEnabled: true,
        orderAlertWebPushEnabled: false,
        orderAlertPhones: [],
        orderAlertWhatsApp: ['+48600100200'],
      },
      env: { ORDER_ALERT_WHATSAPP_TO: '+48600100200, +48600100999' },
    });

    await service.onOrderCreated(EVENT);

    // +48600100200 appears in both config and env → deduped to a single job.
    expect(whatsappQueue.add).toHaveBeenCalledTimes(2);
    const numbers = whatsappQueue.add.mock.calls.map((c) => (c[1] as { phone: string }).phone);
    expect(new Set(numbers)).toEqual(new Set(['+48600100200', '+48600100999']));
    expect(whatsappQueue.add).toHaveBeenCalledWith(JOB_WHATSAPP_NEW_ORDER, expect.anything());
  });

  it('enqueues a single web-push job carrying all staff userIds', async () => {
    const { service, webpushQueue, prisma } = makeService({
      restaurant: {
        orderAlertSmsEnabled: false,
        orderAlertWhatsAppEnabled: false,
        orderAlertWebPushEnabled: true,
        orderAlertPhones: [],
        orderAlertWhatsApp: [],
      },
      staffWithSubs: [{ id: 'u1' }, { id: 'u2' }],
    });

    await service.onOrderCreated(EVENT);

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(webpushQueue.add).toHaveBeenCalledTimes(1);
    expect(webpushQueue.add).toHaveBeenCalledWith(
      JOB_WEBPUSH_NEW_ORDER,
      expect.objectContaining({ userIds: ['u1', 'u2'], adminUrl: 'https://admin.example.com/orders/ord_1' }),
    );
  });

  it('skips web-push when no staff have subscriptions', async () => {
    const { service, webpushQueue } = makeService({
      restaurant: {
        orderAlertSmsEnabled: false,
        orderAlertWhatsAppEnabled: false,
        orderAlertWebPushEnabled: true,
        orderAlertPhones: [],
        orderAlertWhatsApp: [],
      },
      staffWithSubs: [],
    });

    await service.onOrderCreated(EVENT);

    expect(webpushQueue.add).not.toHaveBeenCalled();
  });

  it('does nothing when the restaurant has no alert config and no env fallback', async () => {
    const { service, smsQueue, whatsappQueue, webpushQueue } = makeService({
      restaurant: {
        orderAlertSmsEnabled: false,
        orderAlertWhatsAppEnabled: false,
        orderAlertWebPushEnabled: false,
        orderAlertPhones: [],
        orderAlertWhatsApp: [],
      },
    });

    await service.onOrderCreated(EVENT);

    expect(smsQueue.add).not.toHaveBeenCalled();
    expect(whatsappQueue.add).not.toHaveBeenCalled();
    expect(webpushQueue.add).not.toHaveBeenCalled();
  });
});
