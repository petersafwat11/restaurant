'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { RefundDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

interface RefundVariables {
  paymentId: string;
  /** Money string ("12.50") — undefined means full remaining refund. */
  amount?: string;
  reason: string;
  /** Order id passed through for cache invalidation; not sent to the API. */
  orderId: string;
}

/**
 * Issue a refund against an order's payment. The backend recomputes the
 * remaining-refundable amount; passing `amount` undefined refunds the full
 * remaining balance. Triggers a Stripe refund (or BullMQ enqueue if async).
 */
export function useRefundOrder() {
  const qc = useQueryClient();

  return useMutation<RefundDto, ApiError, RefundVariables>({
    mutationFn: ({ paymentId, amount, reason }) =>
      getApiClient().payments.refund(paymentId, { amount, reason }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: orderQueryKeys.detail(vars.orderId) });
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify('success', 'Refund issued — customer will be notified');
    },
    onError: (err) => notify('error', err.message),
  });
}
