'use client';

import { getApiClient } from '@/lib/api-client';
import type { PaymentDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { paymentQueryKeys } from '../query-keys';

export function useOrderPayment(orderId: string): UseQueryResult<PaymentDto | null> {
  return useQuery<PaymentDto | null>({
    queryKey: paymentQueryKeys.byOrder(orderId),
    queryFn: () => getApiClient().payments.byOrderId(orderId),
    enabled: Boolean(orderId),
  });
}
