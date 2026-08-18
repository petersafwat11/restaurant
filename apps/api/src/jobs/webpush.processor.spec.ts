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
    const queue = { add: vi.fn() };
    const processor = new WebPushProcessor(
      {
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription()),
          update,
          delete: vi.fn(),
        },
      } as never,
      { send } as never,
      queue as never,
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
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sub-1' } }));
    // Ring burst starts: first re-alert scheduled 30s later with the same tag
    expect(queue.add).toHaveBeenCalledWith(
      'webpush.order-ring',
      expect.objectContaining({ ringStep: 1 }),
      expect.objectContaining({ delay: 30_000, jobId: 'order-1-ring-1-sub-1' }),
    );
  });

  it('prunes a subscription rejected as expired by the push service', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const queue = { add: vi.fn() };
    const processor = new WebPushProcessor(
      {
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription('pl')),
          update: vi.fn(),
          delete: remove,
        },
      } as never,
      { send: vi.fn().mockResolvedValue('expired') } as never,
      queue as never,
    );

    await processor.process(JOB as never);

    expect(remove).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('sends an urgent reminder if order is still PENDING and chains the next 5m reminder', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
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
      queue as never,
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
    expect(queue.add).toHaveBeenCalledWith(
      'webpush.pending-order-reminder',
      expect.objectContaining({ minutesPending: 10 }),
      expect.objectContaining({ delay: 300_000, jobId: 'order-1-rem-10m-sub-1' }),
    );
  });

  it('sends an urgent reminder if order is still CONFIRMED (unacknowledged)', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
    const processor = new WebPushProcessor(
      {
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'CONFIRMED' }),
        },
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(subscription('en')),
          update: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn(),
        },
      } as never,
      { send } as never,
      queue as never,
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
    expect(queue.add).toHaveBeenCalledWith(
      'webpush.pending-order-reminder',
      expect.objectContaining({ minutesPending: 10 }),
      expect.objectContaining({ delay: 300_000, jobId: 'order-1-rem-10m-sub-1' }),
    );
  });

  it('skips sending reminder if order is already being prepared', async () => {
    const send = vi.fn();
    const queue = { add: vi.fn() };
    const processor = new WebPushProcessor(
      {
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PREPARING' }),
        },
      } as never,
      { send } as never,
      queue as never,
    );

    await processor.process({
      name: 'webpush.pending-order-reminder',
      data: { ...JOB.data, minutesPending: 5 },
    } as never);

    expect(send).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('re-rings a still-pending order with the same tag and chains the next ring step', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
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
      queue as never,
    );

    await processor.process({
      name: 'webpush.order-ring',
      data: { ...JOB.data, ringStep: 1 },
    } as never);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example.test/1' }),
      expect.objectContaining({
        // Same tag as the initial alert so renotify re-sounds the channel
        tag: 'order-order-1',
      }),
    );
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'webpush.order-ring',
      expect.objectContaining({ ringStep: 2 }),
      expect.objectContaining({ delay: 30_000, jobId: 'order-1-ring-2-sub-1' }),
    );
  });

  it('stops the ring burst once the order is acknowledged (not PENDING/CONFIRMED)', async () => {
    const send = vi.fn();
    const queue = { add: vi.fn() };
    const processor = new WebPushProcessor(
      {
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PREPARING' }),
        },
      } as never,
      { send } as never,
      queue as never,
    );

    await processor.process({
      name: 'webpush.order-ring',
      data: { ...JOB.data, ringStep: 2 },
    } as never);

    expect(send).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('ends the ring burst after the maximum number of steps', async () => {
    const send = vi.fn().mockResolvedValue('sent');
    const queue = { add: vi.fn().mockResolvedValue(undefined) };
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
      queue as never,
    );

    await processor.process({
      name: 'webpush.order-ring',
      data: { ...JOB.data, ringStep: 6 },
    } as never);

    expect(send).toHaveBeenCalledOnce();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
