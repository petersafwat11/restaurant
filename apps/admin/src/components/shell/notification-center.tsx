'use client';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationRealtime,
  useNotifications,
} from '@/features/notifications/hooks';
import { useRealtimeStatus } from '@/features/orders/hooks';
import { useRouter } from '@/i18n/navigation';
import type { NotificationDto } from '@repo/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@repo/ui';
import { Bell, BellOff, LoaderCircle, Settings } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

interface NotificationCenterProps {
  userId: string | null | undefined;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const t = useTranslations('admin.layout.topbar.notifications');
  const tRealtime = useTranslations('admin.layout.topbar.realtime');
  const format = useFormatter();
  const router = useRouter();
  const query = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const realtimeStatus = useRealtimeStatus();
  useNotificationRealtime(userId);

  const items = query.data?.items ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;
  const realtimeLabel = tRealtime(
    realtimeStatus === 'connected' ||
      realtimeStatus === 'connecting' ||
      realtimeStatus === 'idle' ||
      realtimeStatus === 'disconnected'
      ? realtimeStatus
      : 'unknown',
  );

  function openNotification(notification: NotificationDto): void {
    if (!notification.readAt) markRead.mutate(notification.id);
    const orderId = orderIdFromData(notification.data);
    if (orderId) router.push(`/orders/${encodeURIComponent(orderId)}`);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void query.refetch()}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('ariaLabel', { count: unreadCount })}
          className="relative grid h-9 w-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:h-8 sm:w-8"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-text-on-accent tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <span
              aria-hidden
              className={cn(
                'absolute right-1 top-1 h-1.5 w-1.5 rounded-full ring-2 ring-bg',
                realtimeStatusClass(realtimeStatus),
              )}
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1rem)] max-w-96 overflow-hidden p-0 sm:w-96"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg">{t('title')}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-subtle">
              <span
                aria-hidden
                className={cn('h-1.5 w-1.5 rounded-full', realtimeStatusClass(realtimeStatus))}
              />
              <span className="truncate">{realtimeLabel}</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="shrink-0 rounded-sm px-1 py-0.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              {t('markAllRead')}
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[min(30rem,calc(100vh-9rem))] overflow-y-auto overscroll-contain p-1">
          {query.isLoading ? (
            <div className="grid min-h-32 place-items-center text-fg-subtle">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-label={t('loading')} />
            </div>
          ) : query.isError ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-xs text-negative">{t('error')}</p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="text-xs font-medium text-accent hover:underline"
              >
                {t('retry')}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
              <BellOff className="h-6 w-6 text-fg-subtle" />
              <p className="mt-2 text-sm font-medium text-fg">{t('emptyTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{t('emptyDescription')}</p>
            </div>
          ) : (
            items.map((notification) => {
              const unread = !notification.readAt;
              const hasOrder = Boolean(orderIdFromData(notification.data));
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => openNotification(notification)}
                  className={cn(
                    'items-start gap-3 rounded-md px-3 py-3 focus:bg-surface',
                    unread && 'bg-accent/[0.06]',
                    hasOrder && 'cursor-pointer',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      unread ? 'bg-accent' : 'bg-fg-disabled',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-xs text-fg', unread && 'font-semibold')}>
                      {notification.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-fg-muted">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[11px] text-fg-subtle">
                      {format.dateTime(new Date(notification.createdAt), {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          onSelect={() => router.push('/settings#pwa')}
          className="m-1 justify-center gap-2 py-2 text-xs text-fg-muted"
        >
          <Settings className="h-3.5 w-3.5" />
          {t('settings')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function orderIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('orderId' in data)) return null;
  const orderId = (data as { orderId?: unknown }).orderId;
  return typeof orderId === 'string' && orderId.length > 0 ? orderId : null;
}

function realtimeStatusClass(status: ReturnType<typeof useRealtimeStatus>): string {
  if (status === 'connected') return 'bg-positive';
  if (status === 'connecting' || status === 'idle') return 'bg-warning';
  if (status === 'disconnected') return 'bg-negative';
  return 'bg-fg-subtle';
}
