'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CouponDto, CreateCouponDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useCreateCoupon(promotionId: string) {
  const qc = useQueryClient();
  return useMutation<CouponDto, ApiError, CreateCouponDto>({
    mutationFn: (input) => getApiClient().promotions.createCoupon(promotionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.coupons(promotionId) });
      notify('success', 'Coupon created');
    },
    onError: (err) => notify('error', err.message),
  });
}
