import { describe, expect, it } from 'vitest';
import { CustomerSegmentsService } from '../customer-segments.service';

describe('CustomerSegmentsService', () => {
  const svc = new CustomerSegmentsService();
  const now = new Date('2026-05-14T12:00:00Z');

  it('classifies VIP by lifetime orders', () => {
    expect(
      svc.classify({
        lifetimeOrders: 25,
        lifetimeSpend: 500,
        firstOrderAt: new Date('2025-01-01'),
        lastOrderAt: new Date('2026-05-01'),
        accountCreatedAt: new Date('2024-01-01'),
        ordersLast90Days: 2,
        now,
      }),
    ).toBe('vip');
  });

  it('classifies VIP by lifetime spend', () => {
    expect(
      svc.classify({
        lifetimeOrders: 4,
        lifetimeSpend: 3000,
        firstOrderAt: new Date('2025-01-01'),
        lastOrderAt: new Date('2026-05-01'),
        accountCreatedAt: new Date('2024-01-01'),
        ordersLast90Days: 1,
        now,
      }),
    ).toBe('vip');
  });

  it('classifies frequent', () => {
    expect(
      svc.classify({
        lifetimeOrders: 6,
        lifetimeSpend: 400,
        firstOrderAt: new Date('2025-12-01'),
        lastOrderAt: new Date('2026-05-01'),
        accountCreatedAt: new Date('2025-12-01'),
        ordersLast90Days: 6,
        now,
      }),
    ).toBe('frequent');
  });

  it('classifies dormant', () => {
    expect(
      svc.classify({
        lifetimeOrders: 3,
        lifetimeSpend: 200,
        firstOrderAt: new Date('2025-01-01'),
        lastOrderAt: new Date('2026-01-01'),
        accountCreatedAt: new Date('2024-01-01'),
        ordersLast90Days: 0,
        now,
      }),
    ).toBe('dormant');
  });

  it('classifies new (no orders, recent account)', () => {
    expect(
      svc.classify({
        lifetimeOrders: 0,
        lifetimeSpend: 0,
        firstOrderAt: null,
        lastOrderAt: null,
        accountCreatedAt: new Date('2026-05-01'),
        ordersLast90Days: 0,
        now,
      }),
    ).toBe('new');
  });

  it('returns null for inactive zero-order long-time accounts', () => {
    expect(
      svc.classify({
        lifetimeOrders: 0,
        lifetimeSpend: 0,
        firstOrderAt: null,
        lastOrderAt: null,
        accountCreatedAt: new Date('2024-01-01'),
        ordersLast90Days: 0,
        now,
      }),
    ).toBeNull();
  });

  it('classifies active fallback', () => {
    expect(
      svc.classify({
        lifetimeOrders: 4,
        lifetimeSpend: 300,
        firstOrderAt: new Date('2025-01-01'),
        lastOrderAt: new Date('2026-05-10'),
        accountCreatedAt: new Date('2024-01-01'),
        ordersLast90Days: 2,
        now,
      }),
    ).toBe('active');
  });
});
