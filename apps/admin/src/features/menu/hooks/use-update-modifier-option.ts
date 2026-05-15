'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ModifierOptionDto, UpdateModifierOptionDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useUpdateModifierOption(restaurantId: string, id: string) {
  const qc = useQueryClient();
  return useMutation<ModifierOptionDto, ApiError, UpdateModifierOptionDto>({
    mutationFn: (input) => getApiClient().menu.modifierOptions.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
