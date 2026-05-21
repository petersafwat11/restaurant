'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

interface CancelVariables {
  orderId: string;
  reason: string;
  note?: string;
}

/**
 * Cancel an order. Backend re-checks `order:cancel` permission and FSM
 * legality (only orders in non-terminal states can be cancelled).
 */
export function useCancelOrder() {
  const qc = useQueryClient();

  return useMutation<OrderDto, ApiError, CancelVariables>({
    mutationFn: ({ orderId, reason, note }) =>
      getApiClient().orders.updateStatus(orderId, {
        to: 'CANCELLED',
        reason,
        note: note ?? null,
      }),
    onSuccess: (data) => {
      qc.setQueryData(orderQueryKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify('success', `Order ${data.orderNumber} cancelled`);
    },
    onError: (err) => notify('error', err.message),
  });
}
