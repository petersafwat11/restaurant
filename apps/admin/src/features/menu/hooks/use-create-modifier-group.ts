'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateModifierGroupDto, ModifierGroupDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useCreateModifierGroup(restaurantId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation<ModifierGroupDto, ApiError, CreateModifierGroupDto>({
    mutationFn: (input) => getApiClient().menu.modifierGroups.create(itemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
      notify('success', 'Modifier group created');
    },
    onError: (err) => notify('error', err.message),
  });
}
