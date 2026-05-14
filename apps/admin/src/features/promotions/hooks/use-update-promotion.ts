'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { PromotionDto, UpdatePromotionDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useUpdatePromotion(id: string) {
  const qc = useQueryClient();
  return useMutation<PromotionDto, ApiError, UpdatePromotionDto>({
    mutationFn: (input) => getApiClient().promotions.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.all });
      notify('success', 'Promotion updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
