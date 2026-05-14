'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateModifierOptionDto, ModifierOptionDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useCreateModifierOption(restaurantId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation<ModifierOptionDto, ApiError, CreateModifierOptionDto>({
    mutationFn: (input) => getApiClient().menu.modifierOptions.create(groupId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
