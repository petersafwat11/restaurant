'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OperatingHoursDto, UpdateOperatingHoursDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

export function useUpdateOperatingHours(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<OperatingHoursDto[], ApiError, UpdateOperatingHoursDto>({
    mutationFn: (input) => getApiClient().restaurants.updateHours(restaurantId, input),
    onSuccess: (data) => {
      qc.setQueryData(restaurantQueryKeys.hours(restaurantId), data);
      qc.invalidateQueries({ queryKey: restaurantQueryKeys.all });
      notify('success', 'Hours saved');
    },
    onError: (err) => notify('error', err.message),
  });
}
