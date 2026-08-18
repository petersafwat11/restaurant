import { describe, expect, it, vi } from 'vitest';
import { WebPushProcessor } from './webpush.processor';

const JOB = {
  name: 'webpush.new-order',
  data: {
    subscriptionId: 'sub-1',
    orderId: 'order-1',
    orderNumber: 'R-2026-000001',
    orderType: 'PICKUP',
    itemCount: 1,
    currency: 'PLN',
    grandTotal: '24.90',
    customerName: null,
    adminBaseUrl: 'https://admin.example.test',
  },
};

function subscription(locale = 'en') {
  return {
    id: 'sub-1',
    endpoint: 'https://push.example.test/1',
    p256dh: 'p256dh',
    auth: 'auth',
    user: { locale },
  };
}

describe('WebPushProcessor', () => {
  it('sends a localized order deep link and records successful use', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const send = vi.fn().mockResolvedValue('sent');
    const processor = new WebPushProcessor(
      {
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription()),
          update,
          delete: vi.fn(),
        },
      } as never,
      { send } as never,
    );

    await processor.process(JOB as never);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example.test/1' }),
      expect.objectContaining({
        title: 'New order R-2026-000001',
        url: 'https://admin.example.test/en/orders/order-1',
        tag: 'order-order-1',
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' } }),
    );
  });

  it('prunes a subscription rejected as expired by the push service', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const processor = new WebPushProcessor(
      {
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription('pl')),
          update: vi.fn(),
          delete: remove,
        },
      } as never,
      { send: vi.fn().mockResolvedValue('expired') } as never,
    );

    await processor.process(JOB as never);

    expect(remove).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
  });

  it('sends an urgent reminder if order is still PENDING', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    const processor = new WebPushProcessor(
      {
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PENDING' }),
        },
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription('en')),
          update: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn(),
        },
      } as never,
      { send } as never,
    );

    await processor.process({
      name: 'webpush.pending-order-reminder',
      data: { ...JOB.data, minutesPending: 5 },
    } as never);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example.test/1' }),
      expect.objectContaining({
        title: '⚠️ URGENT: Order R-2026-000001 still pending (5m)',
      }),
    );
  });

  it('skips sending reminder if order is no longer PENDING', async () => {
    const send = vi.fn();
    const processor = new WebPushProcessor(
      {
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'CONFIRMED' }),
        },
      } as never,
      { send } as never,
    );

    await processor.process({
      name: 'webpush.pending-order-reminder',
      data: { ...JOB.data, minutesPending: 5 },
    } as never);

    expect(send).not.toHaveBeenCalled();
  });
});
