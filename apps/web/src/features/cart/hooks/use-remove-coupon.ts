'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useRemoveCoupon(restaurantId: string) {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const getSessionKey = useCartStore((s) => s.getSessionKey);

  return useMutation<CartDto, ApiError, void>({
    mutationFn: () =>
      getApiClient().cart.removeCoupon({ restaurantId, sessionKey: getSessionKey() }),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.byRestaurant(restaurantId), data);
      setCart(data);
    },
    onError: (err) => notify('error', err.message),
  });
}
