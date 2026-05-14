'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateRefundDto, RefundDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../../orders/query-keys';
import { paymentQueryKeys } from '../query-keys';

export function useCreateRefund(paymentId: string, orderId: string) {
  const qc = useQueryClient();
  return useMutation<RefundDto, ApiError, CreateRefundDto>({
    mutationFn: (input) => getApiClient().payments.refund(paymentId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentQueryKeys.byOrder(orderId) });
      qc.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
      notify('success', 'Refund issued');
    },
    onError: (err) => notify('error', err.message),
  });
}
