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
  it('queues one retryable job per eligible device', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }]);
    const add = vi.fn().mockResolvedValue(undefined);
    const service = new StaffOrderAlertService(
      { webPushSubscription: { findMany } } as never,
      {
        VAPID_PUBLIC_KEY: 'public',
        VAPID_PRIVATE_KEY: 'private',
        APP_URL_ADMIN: 'https://admin.example.test',
      } as never,
      { add } as never,
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

  it('does not query or queue when VAPID is unconfigured', async () => {
    const findMany = vi.fn();
    const add = vi.fn();
    const service = new StaffOrderAlertService(
      { webPushSubscription: { findMany } } as never,
      { VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', APP_URL_ADMIN: 'http://localhost:3001' } as never,
      { add } as never,
    );

    await service.onOrderCreated(EVENT);

    expect(findMany).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});
