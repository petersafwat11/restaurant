import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useClearCart() {
  const qc = useQueryClient();
  const sessionKey = useCartStore((s) => s.sessionKey);
  const setCart = useCartStore((s) => s.setCart);

  return useMutation<CartDto, ApiError, void>({
    mutationFn: () => getApiClient().cart.clear({ sessionKey: sessionKey ?? undefined }),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.current(), data);
      setCart(data);
      notify('success', 'Cart cleared');
    },
    onError: (err) => notify('error', err.message),
  });
}
