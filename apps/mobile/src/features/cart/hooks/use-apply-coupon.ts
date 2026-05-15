import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { ApplyCouponDto, CartDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

export function useApplyCoupon(restaurantId: string) {
  const qc = useQueryClient();
  const sessionKey = useCartStore((s) => s.sessionKey);
  const setCart = useCartStore((s) => s.setCart);

  return useMutation<CartDto, ApiError, ApplyCouponDto>({
    mutationFn: (input) =>
      getApiClient().cart.applyCoupon({ restaurantId, sessionKey: sessionKey ?? undefined }, input),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.byRestaurant(restaurantId), data);
      setCart(data);
      notify('success', 'Coupon applied');
    },
    onError: (err) => notify('error', err.message),
  });
}
