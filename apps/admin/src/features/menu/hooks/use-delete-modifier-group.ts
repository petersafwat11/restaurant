'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useDeleteModifierGroup(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { id: string }>({
    mutationFn: ({ id }) => getApiClient().menu.modifierGroups.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
