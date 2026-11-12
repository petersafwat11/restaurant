'use client';

import {
  type OrderableItem,
  PREFERRED_ORDER_TYPE_KEY,
  useDishOrdering,
} from '@/features/menu/hooks/use-dish-ordering';
import { ShoppingBag, Truck } from 'lucide-react';

/**
 * Dish-page CTAs. Both buttons start the normal ordering flow (the same
 * add-to-cart sheet as the menu); "pickup" additionally pre-selects pickup at
 * checkout via a session-scoped preference. Checkout itself is unchanged.
 */
export function DishOrderActions({
  item,
  deliveryLabel,
  pickupLabel,
  showPickup,
  showDelivery,
}: {
  item: OrderableItem;
  deliveryLabel: string;
  pickupLabel: string;
  showPickup: boolean;
  showDelivery: boolean;
}) {
  const { quickAdd, sheet } = useDishOrdering();

  function order(type: 'DELIVERY' | 'PICKUP') {
    try {
      window.sessionStorage.setItem(PREFERRED_ORDER_TYPE_KEY, type);
    } catch {
      // Storage unavailable (private mode) — checkout keeps its default.
    }
    quickAdd(item);
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        {showDelivery && (
          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={() => order('DELIVERY')}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-accent px-6 text-[15px] font-semibold text-text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            <Truck size={18} aria-hidden />
            {deliveryLabel}
          </button>
        )}
        {showPickup && (
          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={() => order('PICKUP')}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] px-6 text-[15px] font-medium text-fg hover:bg-surface-warm/40 disabled:opacity-50"
          >
            <ShoppingBag size={18} aria-hidden />
            {pickupLabel}
          </button>
        )}
      </div>
      {sheet}
    </>
  );
}
