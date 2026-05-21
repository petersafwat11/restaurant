'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto, UpdateCartItemDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useUpdateCartItem() {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const beginMutation = useCartStore((s) => s.beginMutation);
  const endMutation = useCartStore((s) => s.endMutation);
  const sessionKey = useCartSessionKey();

  return useMutation<CartDto, ApiError, { cartItemId: string; input: UpdateCartItemDto }>({
    mutationFn: ({ cartItemId, input }) =>
      getApiClient().cart.updateItem(cartItemId, { sessionKey: sessionKey ?? undefined }, input),
    onMutate: () => beginMutation(),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.current(sessionKey), data);
      setCart(data);
    },
    onError: (err) => notify('error', err.message),
    onSettled: () => endMutation(),
  });
}
