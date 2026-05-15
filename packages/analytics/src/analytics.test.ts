import { describe, expect, it } from 'vitest';
import { createAnalytics } from './client';
import { ANALYTICS_EVENT_NAMES } from './events';

describe('analytics (no-op safe)', () => {
  it('is disabled with no key but still validates payloads', () => {
    const a = createAnalytics({});
    expect(a.enabled).toBe(false);
    expect(() =>
      a.capture('order_placed', {
        userId: 'u1',
        orderId: 'o1',
        grandTotal: '10.00',
        currency: 'PLN',
        type: 'PICKUP',
      }),
    ).not.toThrow();
  });

  it('throws on an invalid payload (programming error)', () => {
    const a = createAnalytics({});
    expect(() =>
      // @ts-expect-error — missing required fields
      a.capture('signup', { userId: 'u1' }),
    ).toThrow();
  });

  it('enables with a key', async () => {
    const a = createAnalytics({ key: 'phc_test' });
    expect(a.enabled).toBe(true);
    await a.shutdown();
  });

  it('exposes the full event catalog', () => {
    expect(ANALYTICS_EVENT_NAMES).toContain('order_placed');
    expect(ANALYTICS_EVENT_NAMES).toContain('referral_completed');
  });
});
