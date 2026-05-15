'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ReorderItemsDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useReorderItems(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, ReorderItemsDto>({
    mutationFn: (input) => getApiClient().menu.items.reorder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
