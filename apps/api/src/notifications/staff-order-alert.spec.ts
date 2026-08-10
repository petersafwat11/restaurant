import type { OrderCreatedEvent } from '@repo/types';
import { describe, expect, it, vi } from 'vitest';
import { StaffOrderAlertService } from './staff-order-alert.service';

vi.mock('../config/config.module', () => ({ ENV: Symbol('ENV') }));

const EVENT: OrderCreatedEvent = {
  orderId: 'order-1',
  orderNumber: 'R-2026-000001',
  userId: null,
  status: 'PENDING',
  type: 'DELIVERY',
  grandTotal: '49.90',
  currency: 'PLN',
  itemCount: 2,
  customerName: 'Ada',
  createdAt: '2026-08-10T00:00:00.000Z',
};

describe('StaffOrderAlertService', () => {
  it('creates one realtime in-app notification per eligible staff user', async () => {
    const createdAt = new Date('2026-08-10T00:00:01.000Z');
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'notification-1',
        type: 'new_order',
        title: 'New order R-2026-000001',
        body: 'Ada · Delivery · 2 items · 49.90 PLN',
        createdAt,
      })
      .mockResolvedValueOnce({
        id: 'notification-2',
        type: 'new_order',
        title: 'Nowe zamówienie R-2026-000001',
        body: 'Ada · Dostawa · 2 szt. · 49.90 PLN',
        createdAt,
      });
    const findMany = vi.fn().mockResolvedValue([
      { id: 'user-1', locale: 'en', webPushSubscriptions: [] },
      { id: 'user-2', locale: 'pl', webPushSubscriptions: [] },
    ]);
    const emit = vi.fn();
    const service = new StaffOrderAlertService(
      { user: { findMany }, notification: { create } } as never,
      {
        VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        APP_URL_ADMIN: 'http://localhost:3001',
      } as never,
      { add: vi.fn() } as never,
      { emit } as never,
    );

    await service.onOrderCreated(EVENT);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'new_order',
          title: 'New order R-2026-000001',
          data: expect.objectContaining({ orderId: EVENT.orderId }),
        }),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({
        userId: 'user-2',
        notification: expect.objectContaining({ id: 'notification-2' }),
      }),
    );
  });

  it('queues one retryable job per eligible device', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'user-1',
        locale: 'en',
        webPushSubscriptions: [{ id: 'sub-1' }, { id: 'sub-2' }],
      },
    ]);
    const add = vi.fn().mockResolvedValue(undefined);
    const service = new StaffOrderAlertService(
      {
        user: { findMany },
        notification: {
          create: vi.fn().mockResolvedValue({
            id: 'notification-1',
            type: 'new_order',
            title: 'New order R-2026-000001',
            body: 'Ada · Delivery · 2 items · 49.90 PLN',
            createdAt: new Date(),
          }),
        },
      } as never,
      {
        VAPID_PUBLIC_KEY: 'public',
        VAPID_PRIVATE_KEY: 'private',
        APP_URL_ADMIN: 'https://admin.example.test',
      } as never,
      { add } as never,
      { emit: vi.fn() } as never,
    );

    await service.onOrderCreated(EVENT);

    expect(findMany).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenCalledWith(
      'webpush.new-order',
      expect.objectContaining({ subscriptionId: 'sub-1', orderId: EVENT.orderId }),
      expect.objectContaining({ jobId: 'order-1-sub-1', attempts: 3 }),
    );
  });

  it('still creates in-app notifications without querying Web Push when VAPID is unconfigured', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const add = vi.fn();
    const service = new StaffOrderAlertService(
      { user: { findMany }, notification: { create: vi.fn() } } as never,
      {
        VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        APP_URL_ADMIN: 'http://localhost:3001',
      } as never,
      { add } as never,
      { emit: vi.fn() } as never,
    );

    await service.onOrderCreated(EVENT);

    expect(findMany).toHaveBeenCalledOnce();
    expect(add).not.toHaveBeenCalled();
  });
});
