'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useRemoveCartItem(restaurantId: string) {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const beginMutation = useCartStore((s) => s.beginMutation);
  const endMutation = useCartStore((s) => s.endMutation);
  const getSessionKey = useCartStore((s) => s.getSessionKey);

  return useMutation<CartDto, ApiError, { cartItemId: string }>({
    mutationFn: ({ cartItemId }) =>
      getApiClient().cart.removeItem(cartItemId, { sessionKey: getSessionKey() }),
    onMutate: () => beginMutation(),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.byRestaurant(restaurantId), data);
      setCart(data);
    },
    onError: (err) => notify('error', err.message),
    onSettled: () => endMutation(),
  });
}
