import type { NotificationListQuery } from '@repo/types';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationQueryKeys.all, 'list'] as const,
  list: (query: NotificationListQuery) => [...notificationQueryKeys.lists(), query] as const,
};
