'use client';

import { getApiClient } from '@/lib/api-client';
import type { PaymentConfigDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { paymentQueryKeys } from '../query-keys';

export function usePaymentConfig(): UseQueryResult<PaymentConfigDto> {
  return useQuery<PaymentConfigDto>({
    queryKey: paymentQueryKeys.config,
    queryFn: () => getApiClient().payments.getConfig(),
    // The config only changes on (re)deploy, so a *successful* result is cached
    // indefinitely — no needless refetches, no button flicker. But this value
    // gates card/BLIK availability at checkout, so a transient failure (e.g. the
    // API mid-restart, a cold start, a network blip) must never silently strip
    // online payments and leave the customer COD-only. So, unlike the app-wide
    // defaults (retry: 1, refetchOnWindowFocus: false), we retry a few times with
    // backoff and — because a query that has never succeeded is never "fresh" —
    // refetch on window-focus / reconnect until it succeeds. That self-heals a
    // tab that loaded while the API was momentarily down.
    staleTime: Number.POSITIVE_INFINITY,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
