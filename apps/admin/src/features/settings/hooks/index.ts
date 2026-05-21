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
  current: () => ['settings', 'current'] as const,
};

export function useRestaurantSettings() {
  return useQuery<RestaurantSettingsDto>({
    queryKey: settingsKeys.current(),
    queryFn: () => getApiClient().settings.get(),
  });
}

export function useUpdateRestaurantSettings() {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, UpdateRestaurantSettingsDto>({
    mutationFn: (input) => getApiClient().settings.update(input),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', 'Settings saved');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useAddHoliday() {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, HolidayDto>({
    mutationFn: (input) => getApiClient().settings.addHoliday(input),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', 'Holiday added');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useRemoveHoliday() {
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, string>({
    mutationFn: (date) => getApiClient().settings.removeHoliday(date),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', 'Holiday removed');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useCheckDeliveryZone() {
  return useMutation<DeliveryZoneCheckResponseDto, ApiError, DeliveryZoneCheckQuery>({
    mutationFn: (q) => getApiClient().settings.checkDeliveryZone(q),
  });
}
