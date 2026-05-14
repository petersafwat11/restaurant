'use client';

import { getApiClient } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import type { CartDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cartQueryKeys } from '../query-keys';

export function useCart(restaurantId: string): UseQueryResult<CartDto> {
  const setCart = useCartStore((s) => s.setCart);
  const getSessionKey = useCartStore((s) => s.getSessionKey);

  const query = useQuery<CartDto>({
    queryKey: cartQueryKeys.byRestaurant(restaurantId),
    queryFn: () =>
      getApiClient().cart.get({
        restaurantId,
        sessionKey: getSessionKey(),
      }),
    enabled: Boolean(restaurantId),
  });

  useEffect(() => {
    if (query.data) setCart(query.data);
  }, [query.data, setCart]);

  return query;
}
