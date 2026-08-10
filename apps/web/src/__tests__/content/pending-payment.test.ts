import {
  isMissingPendingOrderError,
  parsePendingPayment,
} from '@/features/checkout/pending-payment';
import { describe, expect, it } from 'vitest';

describe('parsePendingPayment', () => {
  it('restores a signed guest payment retry', () => {
    expect(parsePendingPayment('{"orderId":"order_123","token":"signed-token"}')).toEqual({
      orderId: 'order_123',
      token: 'signed-token',
    });
  });

  it('restores an authenticated retry without a guest token', () => {
    expect(parsePendingPayment('{"orderId":"order_123","token":null}')).toEqual({
      orderId: 'order_123',
      token: null,
    });
  });

  it.each([null, '', '{}', 'not-json', '{"orderId":12}', '{"orderId":"x","token":12}'])(
    'rejects invalid pending-payment data: %s',
    (raw) => expect(parsePendingPayment(raw)).toBeNull(),
  );
});

describe('isMissingPendingOrderError', () => {
  it('recognizes missing orders and expired guest authorization', () => {
    expect(isMissingPendingOrderError({ status: 404, message: 'Order not found' })).toBe(true);
    expect(isMissingPendingOrderError({ code: 'NOT_FOUND', message: 'Missing' })).toBe(true);
    expect(isMissingPendingOrderError(new Error('Order not found'))).toBe(true);
    expect(isMissingPendingOrderError({ status: 403, message: 'Not your order' })).toBe(true);
    expect(isMissingPendingOrderError({ code: 'FORBIDDEN', message: 'Forbidden' })).toBe(true);
    expect(isMissingPendingOrderError(new Error('Not your order'))).toBe(true);
    expect(isMissingPendingOrderError({ status: 400, message: 'Order is already paid' })).toBe(
      true,
    );
    expect(isMissingPendingOrderError(new Error('Order payment is already paid'))).toBe(true);
    expect(isMissingPendingOrderError({ status: 400, message: 'Invalid payment method' })).toBe(
      false,
    );
    expect(isMissingPendingOrderError({ status: 500 })).toBe(false);
    expect(isMissingPendingOrderError(null)).toBe(false);
  });
});
