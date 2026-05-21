'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useDeleteMenuCategory() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { id: string }>({
    mutationFn: ({ id }) => getApiClient().menu.categories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Category deleted');
    },
    onError: (err) => notify('error', err.message),
  });
}
