import { describe, expect, it } from 'vitest';
import { type ReceiptInput, receiptTextLines } from './receipt-pdf';

// Fixed timestamp keeps the formatted "createdAt" deterministic in snapshots.
const FIXED_CREATED_AT = '2026-05-15T12:30:00.000Z';

const baseInput: ReceiptInput = {
  restaurantName: 'The Test Kitchen',
  orderNumber: 'R-2026-000001',
  createdAt: FIXED_CREATED_AT,
  currency: 'PLN',
  items: [
    { name: 'Kotlet Schabowy', quantity: 2, unitPrice: '48.00', lineTotal: '96.00' },
    { name: 'Pierogi Ruskie', quantity: 1, unitPrice: '22.00', lineTotal: '22.00' },
  ],
  subtotal: '118.00',
  discountTotal: '0.00',
  taxTotal: '9.44',
  deliveryFee: '0.00',
  tipAmount: '0.00',
  grandTotal: '127.44',
  paymentMethod: 'STRIPE_CARD',
  refundedAmount: null,
};

const refundedInput: ReceiptInput = {
  ...baseInput,
  orderNumber: 'R-2026-000002',
  refundedAmount: '127.44',
};

describe('receipt-pdf', () => {
  it('extracted text matches the snapshot (happy path)', () => {
    const lines = receiptTextLines(baseInput);
    expect(lines).toMatchSnapshot();
  });

  it('extracted text matches the snapshot (refunded variant)', () => {
    const lines = receiptTextLines(refundedInput);
    expect(lines).toMatchSnapshot();
  });

  // Note: actually running `renderReceiptPdf` end-to-end here would require
  // bundling a TTF for `@react-pdf/textkit`'s text-layout pass. The receipt
  // queue+worker path is exercised in the e2e suite — this unit suite
  // protects the *contract* (text + structure) via `receiptTextLines`.

  it('text lines include every contract-critical field', () => {
    const lines = receiptTextLines(baseInput);
    const joined = lines.join('\n');
    expect(joined).toContain('The Test Kitchen');
    expect(joined).toContain('R-2026-000001');
    expect(joined).toContain('Kotlet Schabowy');
    expect(joined).toContain('Subtotal');
    expect(joined).toContain('Tax');
    expect(joined).toContain('Total');
    expect(joined).toContain('Paid with: STRIPE_CARD');
    // PLN currency formatting via the pinned pl-PL locale.
    expect(joined).toMatch(/zł/);
  });
});
