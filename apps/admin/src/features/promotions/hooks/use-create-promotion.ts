'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreatePromotionDto, PromotionDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation<PromotionDto, ApiError, CreatePromotionDto>({
    mutationFn: (input) => getApiClient().promotions.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.all });
      notify('success', 'Promotion created');
    },
    onError: (err) => notify('error', err.message),
  });
}
