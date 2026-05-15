'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  DeliveryZoneCheckQuery,
  DeliveryZoneCheckResponseDto,
  HolidayDto,
  RestaurantSettingsDto,
  UpdateRestaurantSettingsDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const settingsKeys = {
  all: ['settings'] as const,
  byRestaurant: (id: string) => ['settings', id] as const,
};

export function useRestaurantSettings(restaurantId: string) {
  return useQuery<RestaurantSettingsDto>({
    queryKey: settingsKeys.byRestaurant(restaurantId),
    queryFn: () => getApiClient().settings.get(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useUpdateRestaurantSettings(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, UpdateRestaurantSettingsDto>({
    mutationFn: (input) => getApiClient().settings.update(restaurantId, input),
    onSuccess: (data) => qc.setQueryData(settingsKeys.byRestaurant(restaurantId), data),
    onError: (err) => notify('error', err.message),
  });
}

export function useAddHoliday(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, HolidayDto>({
    mutationFn: (input) => getApiClient().settings.addHoliday(restaurantId, input),
    onSuccess: (data) => qc.setQueryData(settingsKeys.byRestaurant(restaurantId), data),
    onError: (err) => notify('error', err.message),
  });
}

export function useRemoveHoliday(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, string>({
    mutationFn: (date) => getApiClient().settings.removeHoliday(restaurantId, date),
    onSuccess: (data) => qc.setQueryData(settingsKeys.byRestaurant(restaurantId), data),
    onError: (err) => notify('error', err.message),
  });
}

export function useCheckDeliveryZone(restaurantId: string) {
  return useMutation<DeliveryZoneCheckResponseDto, ApiError, DeliveryZoneCheckQuery>({
    mutationFn: (q) => getApiClient().settings.checkDeliveryZone(restaurantId, q),
  });
}
