import { describe, expect, it } from 'vitest';
import { computeEta, isTerminalStatus } from '../order-tracking';

const anchor = new Date('2026-05-15T12:00:00.000Z');

describe('order-tracking ETA', () => {
  it('flags terminal statuses and returns no ETA for them', () => {
    for (const s of ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const) {
      expect(isTerminalStatus(s)).toBe(true);
      expect(computeEta({ type: 'PICKUP', status: s, anchorAt: anchor })).toEqual({
        etaMinutes: null,
        estimatedReadyAt: null,
      });
    }
  });

  it('pickup CONFIRMED = base prep only', () => {
    const r = computeEta({ type: 'PICKUP', status: 'CONFIRMED', anchorAt: anchor });
    expect(r.etaMinutes).toBe(25);
    expect(r.estimatedReadyAt).toBe('2026-05-15T12:25:00.000Z');
  });

  it('delivery CONFIRMED adds the delivery leg', () => {
    const r = computeEta({ type: 'DELIVERY', status: 'CONFIRMED', anchorAt: anchor });
    expect(r.etaMinutes).toBe(25 + 20);
  });

  it('delivery OUT_FOR_DELIVERY = delivery leg only (no double count)', () => {
    const r = computeEta({
      type: 'DELIVERY',
      status: 'OUT_FOR_DELIVERY',
      anchorAt: anchor,
    });
    expect(r.etaMinutes).toBe(20);
  });

  it('READY pickup is 0 minutes', () => {
    const r = computeEta({ type: 'PICKUP', status: 'READY', anchorAt: anchor });
    expect(r.etaMinutes).toBe(0);
  });
});
