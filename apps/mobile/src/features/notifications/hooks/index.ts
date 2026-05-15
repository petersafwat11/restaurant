import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  NotificationListDto,
  NotificationListQuery,
  NotificationPreferenceDto,
  RegisterPushTokenDto,
  UnreadCountDto,
  UpdateNotificationPreferenceDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const KEYS = {
  list: (q?: NotificationListQuery) => ['notifications', 'list', q ?? {}] as const,
  unread: ['notifications', 'unread-count'] as const,
  prefs: ['notifications', 'preferences'] as const,
};

export function useNotifications(query?: NotificationListQuery) {
  return useQuery<NotificationListDto>({
    queryKey: KEYS.list(query),
    queryFn: () => getApiClient().notifications.list(query),
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountDto>({
    queryKey: KEYS.unread,
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

export function useRegisterPushToken() {
  return useMutation<{ success: true }, ApiError, RegisterPushTokenDto>({
    mutationFn: (input) => getApiClient().notifications.registerPushToken(input),
    onError: (err) => notify('error', err.message),
  });
}

export function useUnregisterPushToken() {
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (token) => getApiClient().notifications.unregisterPushToken(token),
    onError: (err) => notify('error', err.message),
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferenceDto>({
    queryKey: KEYS.prefs,
    queryFn: () => getApiClient().notifications.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation<NotificationPreferenceDto, ApiError, UpdateNotificationPreferenceDto>({
    mutationFn: (input) => getApiClient().notifications.updatePreferences(input),
    onSuccess: (data) => {
      qc.setQueryData(KEYS.prefs, data);
      notify('success', 'Preferences updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
