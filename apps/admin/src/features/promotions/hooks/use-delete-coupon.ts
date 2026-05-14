'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useDeleteCoupon(promotionId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { id: string }>({
    mutationFn: ({ id }) => getApiClient().coupons.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.coupons(promotionId) });
      notify('success', 'Coupon removed');
    },
    onError: (err) => notify('error', err.message),
  });
}
