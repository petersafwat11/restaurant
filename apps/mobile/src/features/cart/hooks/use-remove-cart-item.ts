import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useRemoveCartItem() {
  const qc = useQueryClient();
  const sessionKey = useCartStore((s) => s.sessionKey);
  const setCart = useCartStore((s) => s.setCart);

  return useMutation<CartDto, ApiError, { cartItemId: string }>({
    mutationFn: ({ cartItemId }) =>
      getApiClient().cart.removeItem(cartItemId, { sessionKey: sessionKey ?? undefined }),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.current(), data);
      setCart(data);
    },
    onError: (err) => notify('error', err.message),
  });
}
