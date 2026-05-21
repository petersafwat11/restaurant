// Must run before any module reads `env`.
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ||= 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET ||= 'b'.repeat(64);
process.env.ORDER_TRACKING_SECRET ||= 'c'.repeat(64);

import { describe, expect, it } from 'vitest';
import {
  signOrderTrackingToken,
  verifyOrderTrackingToken,
} from '../order-tracking-token';

describe('order tracking token HMAC', () => {
  it('roundtrips a valid orderId', () => {
    const token = signOrderTrackingToken('order_abc123');
    const result = verifyOrderTrackingToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderId).toBe('order_abc123');
      expect(result.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    }
  });

  it('rejects a tampered signature', () => {
    const token = signOrderTrackingToken('order_abc123');
    const [payload, sig] = token.split('.');
    const flipped = sig[0] === 'A' ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    const tampered = `${payload}.${flipped}`;
    const result = verifyOrderTrackingToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_signature');
  });

  it('rejects malformed input', () => {
    expect(verifyOrderTrackingToken('').ok).toBe(false);
    expect(verifyOrderTrackingToken('no-dot').ok).toBe(false);
    expect(verifyOrderTrackingToken('a.b.c').ok).toBe(false);
  });

  it('rejects expired tokens', () => {
    const token = signOrderTrackingToken('order_xyz', -1);
    const result = verifyOrderTrackingToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('expired');
  });

  it('different orderIds produce different tokens', () => {
    const a = signOrderTrackingToken('order_a');
    const b = signOrderTrackingToken('order_b');
    expect(a).not.toBe(b);
  });
});
