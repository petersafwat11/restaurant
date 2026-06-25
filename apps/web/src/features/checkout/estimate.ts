import type { OrderType, RestaurantPublicDto } from '@repo/types';

/**
 * The admin-configured indicative ready-time range (minutes) for an order type,
 * or null when not configured (or DINE_IN, which has no range). `max` is null
 * when only a single value was set.
 */
export function estimatedRangeFor(
  restaurant: RestaurantPublicDto | undefined,
  type: OrderType,
): { min: number; max: number | null } | null {
  if (!restaurant) return null;
  const [min, max] =
    type === 'DELIVERY'
      ? [restaurant.estimatedDeliveryMinutesMin, restaurant.estimatedDeliveryMinutesMax]
      : type === 'PICKUP'
        ? [restaurant.estimatedPickupMinutesMin, restaurant.estimatedPickupMinutesMax]
        : [null, null];
  return min != null ? { min, max } : null;
}

type EtaKey =
  | 'eta.minutesRange'
  | 'eta.minutesSingle'
  | 'eta.deliveryDefault'
  | 'eta.pickupDefault'
  | 'eta.dineInDefault';

/**
 * The i18n key (under the `web.shop.checkoutSuccess` namespace) plus ICU values
 * for an order type's indicative estimate. Shared by the checkout order-type
 * cards and the success page so the two surfaces always render the same number —
 * the `eta.*` catalog is the single source of truth for these strings.
 */
export function estimateEtaKey(
  range: { min: number; max: number | null } | null,
  type: OrderType,
): { key: EtaKey; values?: { min: number; max?: number } } {
  if (range) {
    return range.max != null && range.max !== range.min
      ? { key: 'eta.minutesRange', values: { min: range.min, max: range.max } }
      : { key: 'eta.minutesSingle', values: { min: range.min } };
  }
  return {
    key:
      type === 'DELIVERY'
        ? 'eta.deliveryDefault'
        : type === 'PICKUP'
          ? 'eta.pickupDefault'
          : 'eta.dineInDefault',
  };
}
