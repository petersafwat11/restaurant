'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ModifierGroupDto, UpdateModifierGroupDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useUpdateModifierGroup(restaurantId: string, id: string) {
  const qc = useQueryClient();
  return useMutation<ModifierGroupDto, ApiError, UpdateModifierGroupDto>({
    mutationFn: (input) => getApiClient().menu.modifierGroups.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
