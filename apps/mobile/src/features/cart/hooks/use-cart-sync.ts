import { useCartStore } from '@/stores/cart-store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cartQueryKeys } from '../query-keys';

/**
 * Offline-cart reconciliation. The store hydrates a persisted snapshot for
 * instant/offline display; once we have connectivity (driver passes a
 * reconnect signal, e.g. NetInfo `isConnected`) we invalidate the cart query
 * so the server copy becomes the source of truth again. UI wiring of the
 * actual connectivity listener is the UI sprint's job — this is the data hook.
 */
export function useCartSync(restaurantId: string, isOnline: boolean): void {
  const qc = useQueryClient();
  const isHydrated = useCartStore((s) => s.isHydrated);

  useEffect(() => {
    if (!restaurantId || !isHydrated || !isOnline) return;
    qc.invalidateQueries({ queryKey: cartQueryKeys.byRestaurant(restaurantId) });
  }, [restaurantId, isHydrated, isOnline, qc]);
}
