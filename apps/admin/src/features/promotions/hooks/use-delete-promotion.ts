'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { id: string }>({
    mutationFn: ({ id }) => getApiClient().promotions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionQueryKeys.all });
      notify('success', 'Promotion deleted');
    },
    onError: (err) => notify('error', err.message),
  });
}
