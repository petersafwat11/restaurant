'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { NotificationListDto, NotificationListQuery } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationQueryKeys } from '../query-keys';

export { useNotificationRealtime } from './use-notification-realtime';

export function useNotifications(query: NotificationListQuery = { limit: 10 }) {
  return useQuery<NotificationListDto>({
    queryKey: notificationQueryKeys.list(query),
    queryFn: () => getApiClient().notifications.list(query),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (id) => getApiClient().notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    onError: (error) => notify('error', error.message),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<{ success: true; count: number }, ApiError, void>({
    mutationFn: () => getApiClient().notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    onError: (error) => notify('error', error.message),
  });
}
