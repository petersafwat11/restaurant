'use client';

import { getApiClient } from '@/lib/api-client';
import type { PaymentConfigDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { paymentQueryKeys } from '../query-keys';

export function usePaymentConfig(): UseQueryResult<PaymentConfigDto> {
  return useQuery<PaymentConfigDto>({
    queryKey: paymentQueryKeys.config,
    queryFn: () => getApiClient().payments.getConfig(),
    staleTime: Number.POSITIVE_INFINITY, // changes only on deploy
  });
}
