'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

/**
 * Set (or clear) the staff per-order ETA — total prep/delivery minutes from
 * order placement. `null` reverts to the status-based estimate.
 */
export function useSetOrderEta(orderId: string) {
  const qc = useQueryClient();
  return useMutation<OrderDto, ApiError, { prepMinutesOverride: number | null }>({
    mutationFn: (input) => getApiClient().orders.setEta(orderId, input),
    onSuccess: (data) => {
      qc.setQueryData(orderQueryKeys.detail(orderId), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify('success', 'Estimated time updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
