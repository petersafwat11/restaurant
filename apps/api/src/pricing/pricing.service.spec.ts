import { describe, expect, it } from 'vitest';
import { PricingService } from './pricing.service';

/**
 * Unit tests for the pure totals math. We pass a `taxRateOverride` so the
 * service never hits the DB; the real fetch is exercised by the e2e suite.
 */
describe('PricingService.calculateTotals (pure)', () => {
  // Pass a stub for the prisma constructor arg — the service only touches
  // Prisma inside getTaxRate, which we bypass via taxRateOverride.
  const service = new PricingService(undefined as unknown as never);

  it('3 × 9.99 at 8% tax: exact Decimal arithmetic, no float drift', async () => {
    const result = await service.calculateTotals({
      restaurantId: 'r1',
      lines: [
        { unitPrice: '9.99', quantity: 1 },
        { unitPrice: '9.99', quantity: 1 },
        { unitPrice: '9.99', quantity: 1 },
      ],
      taxRateOverride: '0.08',
    });
    expect(result.asStrings.subtotal).toBe('29.97');
    expect(result.asStrings.taxTotal).toBe('2.40');
    expect(result.asStrings.grandTotal).toBe('32.37');
  });

  it('clamps discount to ≤ subtotal, never producing a negative line', async () => {
    const result = await service.calculateTotals({
      restaurantId: 'r1',
      lines: [{ unitPrice: '10.00', quantity: 1 }],
      couponDiscount: '50.00',
      taxRateOverride: '0',
    });
    expect(result.asStrings.discountTotal).toBe('10.00');
    expect(result.asStrings.grandTotal).toBe('0.00');
  });

  it('applies tax after discount', async () => {
    const result = await service.calculateTotals({
      restaurantId: 'r1',
      lines: [{ unitPrice: '100.00', quantity: 1 }],
      couponDiscount: '10.00',
      taxRateOverride: '0.08',
    });
    expect(result.asStrings.subtotal).toBe('100.00');
    expect(result.asStrings.discountTotal).toBe('10.00');
    expect(result.asStrings.taxTotal).toBe('7.20'); // 8% of 90.00
    expect(result.asStrings.grandTotal).toBe('97.20');
  });

  it('adds delivery fee and tip on top', async () => {
    const result = await service.calculateTotals({
      restaurantId: 'r1',
      lines: [{ unitPrice: '50.00', quantity: 1 }],
      deliveryFee: '8.00',
      tipAmount: '5.00',
      taxRateOverride: '0',
    });
    expect(result.asStrings.grandTotal).toBe('63.00');
  });

  it('rejects a tip greater than subtotal', async () => {
    await expect(
      service.calculateTotals({
        restaurantId: 'r1',
        lines: [{ unitPrice: '10.00', quantity: 1 }],
        tipAmount: '999.00',
        taxRateOverride: '0',
      }),
    ).rejects.toThrow(/tipAmount/);
  });
});
