'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { BulkGenerateCouponsDto, BulkGenerateCouponsResponseDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useBulkGenerateCoupons(promotionId: string) {
  const qc = useQueryClient();
  return useMutation<BulkGenerateCouponsResponseDto, ApiError, BulkGenerateCouponsDto>({
    mutationFn: (input) => getApiClient().promotions.bulkGenerateCoupons(promotionId, input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.coupons(promotionId) });
      notify('success', `Generated ${res.created} coupon${res.created === 1 ? '' : 's'}`);
    },
    onError: (err) => notify('error', err.message),
  });
}
