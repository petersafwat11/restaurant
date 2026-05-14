'use client';

import { getApiClient } from '@/lib/api-client';
import type { CouponDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useCoupons(promotionId: string): UseQueryResult<CouponDto[]> {
  return useQuery<CouponDto[]>({
    queryKey: promotionQueryKeys.coupons(promotionId),
    queryFn: () => getApiClient().promotions.listCoupons(promotionId),
    enabled: Boolean(promotionId),
  });
}
