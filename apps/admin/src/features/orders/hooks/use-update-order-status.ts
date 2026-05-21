'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderDto, UpdateOrderStatusDto } from '@repo/types';
import { STATUS_TOKENS } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

export function useUpdateOrderStatus(orderId: string) {
  const qc = useQueryClient();
  return useMutation<OrderDto, ApiError, UpdateOrderStatusDto>({
    mutationFn: (input) => getApiClient().orders.updateStatus(orderId, input),
    onSuccess: (data) => {
      qc.setQueryData(orderQueryKeys.detail(orderId), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify(
        'success',
        `Order #${data.orderNumber} moved to ${STATUS_TOKENS[data.status]?.label ?? data.status}`,
      );
    },
    onError: (err) => notify('error', err.message),
  });
}
