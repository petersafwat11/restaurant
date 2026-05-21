'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { getApiClient } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import type { CartDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { cartQueryKeys } from '../query-keys';

export function useCart(): UseQueryResult<CartDto> {
  const setCart = useCartStore((s) => s.setCart);
  const sessionKey = useCartSessionKey();

  const query = useQuery<CartDto>({
    queryKey: cartQueryKeys.current(sessionKey),
    queryFn: () =>
      getApiClient().cart.get({
        sessionKey: sessionKey ?? undefined,
      }),
    enabled: Boolean(sessionKey),
  });

  useEffect(() => {
    if (query.data) setCart(query.data);
  }, [query.data, setCart]);

  return query;
}
