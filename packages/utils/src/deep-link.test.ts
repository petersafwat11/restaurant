import { describe, expect, it } from 'vitest';
import {
  deepLink,
  notificationsDeepLink,
  orderDeepLink,
  reservationDeepLink,
} from './deep-link';

describe('deep-link', () => {
  it('uses the default scheme', () => {
    expect(deepLink('orders/1')).toBe('restaurant://orders/1');
  });

  it('honors a custom scheme and strips :// if passed', () => {
    expect(deepLink('orders/1', 'myapp')).toBe('myapp://orders/1');
    expect(deepLink('orders/1', 'myapp://')).toBe('myapp://orders/1');
  });

  it('normalizes leading slashes in the path', () => {
    expect(deepLink('///notifications')).toBe('restaurant://notifications');
  });

  it('falls back to default when scheme is blank', () => {
    expect(deepLink('x', '   ')).toBe('restaurant://x');
  });

  it('builds order/notification/reservation links and encodes ids', () => {
    expect(orderDeepLink('ord 1')).toBe('restaurant://orders/ord%201');
    expect(notificationsDeepLink()).toBe('restaurant://notifications');
    expect(reservationDeepLink('r/1', 'app')).toBe('app://reservations/r%2F1');
  });
});
