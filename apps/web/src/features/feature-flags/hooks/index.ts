'use client';

import { getApiClient } from '@/lib/api-client';
import type { FeatureFlagsResolvedDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useFeatureFlags() {
  return useQuery<FeatureFlagsResolvedDto>({
    queryKey: ['feature-flags'],
    queryFn: () => getApiClient().featureFlags.resolved(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags();
  return Boolean(data?.flags[key]);
}
