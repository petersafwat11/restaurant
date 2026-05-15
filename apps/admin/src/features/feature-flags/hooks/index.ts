'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  FeatureFlagAdminDto,
  FeatureFlagListDto,
  FeatureFlagsResolvedDto,
  UpdateFeatureFlagDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const flagKeys = {
  all: ['feature-flags'] as const,
  admin: ['feature-flags', 'admin'] as const,
};

export function useFeatureFlags() {
  return useQuery<FeatureFlagsResolvedDto>({
    queryKey: flagKeys.all,
    queryFn: () => getApiClient().featureFlags.resolved(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags();
  return Boolean(data?.flags[key]);
}

export function useAdminFeatureFlags() {
  return useQuery<FeatureFlagListDto>({
    queryKey: flagKeys.admin,
    queryFn: () => getApiClient().featureFlags.listAdmin(),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation<FeatureFlagAdminDto, ApiError, { key: string; patch: UpdateFeatureFlagDto }>({
    mutationFn: ({ key, patch }) => getApiClient().featureFlags.update(key, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: flagKeys.all });
      qc.invalidateQueries({ queryKey: flagKeys.admin });
    },
    onError: (err) => notify('error', err.message),
  });
}
