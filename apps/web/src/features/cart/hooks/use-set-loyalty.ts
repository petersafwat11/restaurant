'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { getApiClient } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CartDto, SetCartLoyaltyDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartQueryKeys } from '../query-keys';

/**
 * Persist the loyalty-points redemption intent on the cart. The server burns
 * `cart.loyaltyPointsToRedeem` atomically at order creation, so this must be in
 * sync with what the checkout summary shows. Silent on success — the redeem
 * input reflects the applied state itself.
 */
export function useSetCartLoyalty() {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const sessionKey = useCartSessionKey();

  return useMutation<CartDto, ApiError, SetCartLoyaltyDto>({
    mutationFn: (input) => getApiClient().cart.setLoyalty(input),
    onSuccess: (data) => {
      qc.setQueryData(cartQueryKeys.current(sessionKey), data);
      setCart(data);
    },
  });
}
