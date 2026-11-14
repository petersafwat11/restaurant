import { sumMoneyStrings } from '@repo/utils';

export interface DeliveryMinimum {
  /** True when delivery is offered and the subtotal is under the minimum. */
  belowMinimum: boolean;
  /** Amount still missing to reach the minimum, 2dp string ("0.00" when met). */
  missing: string;
  /** The restaurant's delivery minimum, 2dp string. */
  minimum: string;
}

/**
 * How far a cart is from the delivery minimum. Pickup has no minimum, so the
 * UI can steer customers there instead of letting them abandon checkout.
 * Integer-cent arithmetic via sumMoneyStrings (no float drift).
 */
export function deliveryMinimum(
  subtotal: string,
  minOrderAmount: string | null | undefined,
  acceptsDelivery = true,
): DeliveryMinimum {
  const minimum = sumMoneyStrings([minOrderAmount ?? '0']);
  const diff = sumMoneyStrings([minimum, `-${subtotal}`]);
  const belowMinimum = acceptsDelivery && Number.parseFloat(diff) > 0;
  return { belowMinimum, missing: belowMinimum ? diff : '0.00', minimum };
}
