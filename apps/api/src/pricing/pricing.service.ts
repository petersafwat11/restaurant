import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Decimal,
  type DecimalLike,
  addAll,
  clampNonNegative,
  decimalToString,
  multiply,
  toDecimal,
} from '@repo/utils';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingLine {
  unitPrice: DecimalLike;
  quantity: number;
}

export interface CalculateTotalsInput {
  restaurantId: string;
  lines: PricingLine[];
  /** Discount from an applied coupon (≥0). */
  couponDiscount?: DecimalLike;
  /** Flat delivery fee in the restaurant's currency. Sprint 7 wires polygon zones. */
  deliveryFee?: DecimalLike;
  /** Customer-supplied tip (≥0 and ≤ subtotal). */
  tipAmount?: DecimalLike;
  /**
   * Optional override of the restaurant's `taxRate` — used by tests + by the
   * orders module when it wants to lock in a rate at order-creation time.
   */
  taxRateOverride?: DecimalLike;
}

export interface TotalsResult {
  subtotal: Decimal;
  taxTotal: Decimal;
  deliveryFee: Decimal;
  tipAmount: Decimal;
  discountTotal: Decimal;
  grandTotal: Decimal;
  /** All values as fixed-2dp strings; safe for client + DB persistence. */
  asStrings: {
    subtotal: string;
    taxTotal: string;
    deliveryFee: string;
    tipAmount: string;
    discountTotal: string;
    grandTotal: string;
  };
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a restaurant's tax rate. Falls back to the DB-default (8%) if the
   * restaurant row doesn't exist; the calling service will usually reject
   * earlier on a missing restaurant.
   */
  async getTaxRate(restaurantId: string): Promise<Decimal> {
    const row = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { taxRate: true },
    });
    if (!row) throw new NotFoundException('Restaurant not found');
    return toDecimal(row.taxRate.toString());
  }

  async calculateTotals(input: CalculateTotalsInput): Promise<TotalsResult> {
    const taxRate =
      input.taxRateOverride !== undefined
        ? toDecimal(input.taxRateOverride)
        : await this.getTaxRate(input.restaurantId);

    const lineTotals = input.lines.map((l) => multiply(toDecimal(l.unitPrice), l.quantity));
    const subtotal = addAll(lineTotals);

    const couponDiscount = clampNonNegative(input.couponDiscount ?? 0);
    const discountTotal = couponDiscount.gt(subtotal) ? subtotal : couponDiscount;

    // Tax is applied to subtotal-after-discount.
    const taxBase = subtotal.minus(discountTotal);
    const taxTotal = clampNonNegative(multiply(taxBase, taxRate));

    const deliveryFee = clampNonNegative(input.deliveryFee ?? 0);

    const tipAmount = clampNonNegative(input.tipAmount ?? 0);
    if (tipAmount.gt(subtotal)) {
      throw new Error(`tipAmount ${tipAmount.toFixed(2)} exceeds subtotal`);
    }

    const grandTotal = subtotal
      .minus(discountTotal)
      .plus(taxTotal)
      .plus(deliveryFee)
      .plus(tipAmount);

    return {
      subtotal,
      taxTotal,
      deliveryFee,
      tipAmount,
      discountTotal,
      grandTotal,
      asStrings: {
        subtotal: decimalToString(subtotal),
        taxTotal: decimalToString(taxTotal),
        deliveryFee: decimalToString(deliveryFee),
        tipAmount: decimalToString(tipAmount),
        discountTotal: decimalToString(discountTotal),
        grandTotal: decimalToString(grandTotal),
      },
    };
  }
}
