'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { useTranslations } from 'next-intl';
import type {
  NotificationListDto,
  NotificationListQuery,
  NotificationPreferenceDto,
  UnreadCountDto,
  UpdateNotificationPreferenceDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useNotifications(query?: NotificationListQuery) {
  return useQuery<NotificationListDto>({
    queryKey: ['notifications', 'list', query ?? {}],
    queryFn: () => getApiClient().notifications.list(query),
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountDto>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getApiClient().notifications.unreadCount(),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (id) => getApiClient().notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err) => notify('error', err.message),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation<{ success: true; count: number }, ApiError, void>({
    mutationFn: () => getApiClient().notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err) => notify('error', err.message),
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferenceDto>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => getApiClient().notifications.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const t = useTranslations('web.account.notifications');
  return useMutation<NotificationPreferenceDto, ApiError, UpdateNotificationPreferenceDto>({
    mutationFn: (input) => getApiClient().notifications.updatePreferences(input),
    onSuccess: (data) => {
      qc.setQueryData(['notifications', 'preferences'], data);
      notify('success', t('preferencesUpdated'));
    },
    onError: (err) => notify('error', err.message),
  });
}
