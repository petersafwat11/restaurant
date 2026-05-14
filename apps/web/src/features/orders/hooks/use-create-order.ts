'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CreateOrderDto, OrderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { cartQueryKeys } from '../../cart/query-keys';
import { orderQueryKeys } from '../query-keys';

/**
 * Mutation hook for placing an order.
 *
 * The Idempotency-Key is generated once when the hook is first used and held
 * in a ref — that way the same key is reused across retries (network errors,
 * 5xx, accidental double-clicks). When the order succeeds, the ref is
 * regenerated so the next order gets a fresh key.
 */
export function useCreateOrder(restaurantId: string) {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  return useMutation<OrderDto, ApiError, CreateOrderDto>({
    mutationFn: (input) => getApiClient().orders.create(input, idempotencyKey.current),
    onSuccess: (data) => {
      // Cart is cleared server-side; mirror in the local cache.
      qc.invalidateQueries({ queryKey: cartQueryKeys.byRestaurant(restaurantId) });
      setCart(null);
      qc.setQueryData(orderQueryKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      idempotencyKey.current = crypto.randomUUID();
      notify('success', `Order ${data.orderNumber} placed`);
    },
    onError: (err) => notify('error', err.message),
  });
}
