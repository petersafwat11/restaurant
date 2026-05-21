'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ReorderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useReorderMenuItemImages(itemId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, ReorderDto>({
    mutationFn: (input) => getApiClient().menu.items.reorderImages(itemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Images reordered');
    },
    onError: (err) => notify('error', err.message),
  });
}
