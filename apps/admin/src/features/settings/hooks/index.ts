'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { HolidayDto, RestaurantSettingsDto, UpdateRestaurantSettingsDto } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('admin.settings.general');
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, UpdateRestaurantSettingsDto>({
    mutationFn: (input) => getApiClient().settings.update(input),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', t('toasts.saved'));
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useAddHoliday() {
  const t = useTranslations('admin.settings.holidays');
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, HolidayDto>({
    mutationFn: (input) => getApiClient().settings.addHoliday(input),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', t('toasts.added'));
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useRemoveHoliday() {
  const t = useTranslations('admin.settings.holidays');
  const qc = useQueryClient();
  return useMutation<RestaurantSettingsDto, ApiError, string>({
    mutationFn: (date) => getApiClient().settings.removeHoliday(date),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.current(), data);
      notify('success', t('toasts.removed'));
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useChangeOwnPassword() {
  return useMutation<{ success: true }, ApiError, { currentPassword: string; newPassword: string }>(
    {
      mutationFn: (input) => getApiClient().users.changePassword(input),
      onSuccess: () => {
        notify('success', 'Password changed');
      },
      onError: (err) => notify('error', err.message),
    },
  );
}
