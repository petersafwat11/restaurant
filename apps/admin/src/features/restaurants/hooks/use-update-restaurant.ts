'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { RestaurantAdminDto, UpdateRestaurantDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

export function useUpdateRestaurant(id: string) {
  const qc = useQueryClient();
  return useMutation<RestaurantAdminDto, ApiError, UpdateRestaurantDto>({
    mutationFn: (input) => getApiClient().restaurants.update(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: restaurantQueryKeys.all });
      qc.setQueryData(restaurantQueryKeys.bySlug(data.slug), data);
      notify('success', 'Restaurant updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
