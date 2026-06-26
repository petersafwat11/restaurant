import type { NewOrderAlertSummary } from '@repo/jobs';
import { describe, expect, it } from 'vitest';
import { newOrderAlertText, newOrderWhatsappText } from './new-order-alert-copy';

const base: NewOrderAlertSummary = {
  orderId: 'ord_1',
  orderNumber: 'R-2026-000123',
  orderType: 'DELIVERY',
  itemCount: 3,
  currency: 'PLN',
  grandTotal: '84.50',
  customerName: 'Jan K.',
  adminUrl: 'https://admin.example.com/orders/ord_1',
};

describe('newOrderAlertText', () => {
  it('builds a one-line summary with type label and customer', () => {
    expect(newOrderAlertText(base)).toBe('New order R-2026-000123 · Delivery · 3 items · 84.50 PLN · Jan K.');
  });

  it('singularises a one-item order and omits a missing customer name', () => {
    expect(newOrderAlertText({ ...base, itemCount: 1, customerName: null })).toBe(
      'New order R-2026-000123 · Delivery · 1 item · 84.50 PLN',
    );
  });

  it('maps each order type to a readable label', () => {
    expect(newOrderAlertText({ ...base, orderType: 'PICKUP' })).toContain('Pickup');
    expect(newOrderAlertText({ ...base, orderType: 'DINE_IN' })).toContain('Dine-in');
  });
});

describe('newOrderWhatsappText', () => {
  it('appends the manage link on its own line', () => {
    expect(newOrderWhatsappText(base)).toBe(
      'New order R-2026-000123 · Delivery · 3 items · 84.50 PLN · Jan K.\nManage: https://admin.example.com/orders/ord_1',
    );
  });
});
