import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useCartStore } from '@/stores/cart-store';
import type { ApiError } from '@repo/api-client';
import type { CreateOrderDto, OrderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { cartQueryKeys } from '../../cart/query-keys';
import { orderQueryKeys } from '../query-keys';

function uuid(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const idempotencyKey = useRef<string>(uuid());

  return useMutation<OrderDto, ApiError, CreateOrderDto>({
    mutationFn: (input) => getApiClient().orders.create(input, idempotencyKey.current),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: cartQueryKeys.current() });
      setCart(null);
      qc.setQueryData(orderQueryKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      idempotencyKey.current = uuid();
      notify('success', `Order ${data.orderNumber} placed`);
    },
    onError: (err) => notify('error', err.message),
  });
}
