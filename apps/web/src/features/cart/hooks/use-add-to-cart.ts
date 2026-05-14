'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { AddCartItemDto, CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useAddToCart(restaurantId: string) {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const beginMutation = useCartStore((s) => s.beginMutation);
  const endMutation = useCartStore((s) => s.endMutation);
  const getSessionKey = useCartStore((s) => s.getSessionKey);

  return useMutation<CartDto, ApiError, AddCartItemDto>({
    mutationFn: (input) =>
      getApiClient().cart.addItem({ restaurantId, sessionKey: getSessionKey() }, input),
    onMutate: () => beginMutation(),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.byRestaurant(restaurantId), data);
      setCart(data);
      notify('success', 'Added to cart');
    },
    onError: (err) => notify('error', err.message),
    onSettled: () => endMutation(),
  });
}
