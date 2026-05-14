import { getApiClient } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import type { CartDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cartQueryKeys } from '../query-keys';

export function useCart(restaurantId: string): UseQueryResult<CartDto> {
  const sessionKey = useCartStore((s) => s.sessionKey);
  const isHydrated = useCartStore((s) => s.isHydrated);
  const setCart = useCartStore((s) => s.setCart);

  const query = useQuery<CartDto>({
    queryKey: cartQueryKeys.byRestaurant(restaurantId),
    queryFn: () =>
      getApiClient().cart.get({
        restaurantId,
        sessionKey: sessionKey ?? undefined,
      }),
    enabled: Boolean(restaurantId) && isHydrated,
  });

  useEffect(() => {
    if (query.data) setCart(query.data);
  }, [query.data, setCart]);

  return query;
}
