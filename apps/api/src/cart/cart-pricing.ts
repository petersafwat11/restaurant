import type { CartItem } from '@repo/db';
import type { CartTotalsDto } from '@repo/types';
import {
  type DecimalLike,
  addAll,
  clampNonNegative,
  decimalToString,
  multiply,
  toDecimal,
} from '@repo/utils';

export interface CartPricingInput {
  items: Pick<CartItem, 'unitPrice' | 'quantity'>[];
  /** Already-validated discount amount (in PLN/USD/whatever, ≥0). */
  discountAmount?: DecimalLike;
}

/**
 * Cart-side pricing: subtotal + discount → estimated total.
 * Tax/delivery/tip are computed at checkout (Sprint 4's `pricing.service`).
 */
export function calculateCartTotals(input: CartPricingInput): CartTotalsDto {
  const lineTotals = input.items.map((it) => multiply(toDecimal(it.unitPrice), it.quantity));
  const subtotal = addAll(lineTotals);
  const discount = input.discountAmount ? clampNonNegative(input.discountAmount) : toDecimal(0);
  // Don't allow discount to push estimated total negative.
  const discountApplied = discount.gt(subtotal) ? subtotal : discount;
  const estimatedTotal = subtotal.minus(discountApplied);
  return {
    subtotal: decimalToString(subtotal),
    discountTotal: decimalToString(discountApplied),
    estimatedTotal: decimalToString(estimatedTotal),
  };
}
