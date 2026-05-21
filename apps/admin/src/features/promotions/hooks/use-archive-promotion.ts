'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { PromotionDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useArchivePromotion() {
  const qc = useQueryClient();
  return useMutation<PromotionDto, ApiError, { id: string; archive: boolean }>({
    mutationFn: ({ id, archive }) =>
      archive ? getApiClient().promotions.archive(id) : getApiClient().promotions.unarchive(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.all });
      notify('success', vars.archive ? 'Promotion archived' : 'Promotion restored');
    },
    onError: (err) => notify('error', err.message),
  });
}
