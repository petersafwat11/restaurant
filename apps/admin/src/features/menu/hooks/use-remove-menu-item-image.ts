'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useRemoveMenuItemImage(restaurantId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { imageId: string }>({
    mutationFn: ({ imageId }) => getApiClient().menu.items.removeImage(itemId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
