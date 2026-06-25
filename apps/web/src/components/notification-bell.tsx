'use client';

import { useNotificationRealtime, useUnreadCount } from '@/features/notifications/hooks';
import { Link } from '@/i18n/navigation';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  /** Signed-in user's id — used to join their realtime notifications room. */
  userId: string;
  /** Translated aria-label. Falls back to English when absent. */
  ariaLabel?: string;
}

/**
 * Header bell with an unread-count bubble, mirroring CartButton. Subscribes to
 * the user's realtime room so the count updates live. Only mount when the user
 * is signed in (the badge endpoints are auth-only).
 */
export function NotificationBell({ userId, ariaLabel }: NotificationBellProps) {
  const { data } = useUnreadCount();
  const count = data?.unreadCount ?? 0;
  useNotificationRealtime(userId);

  return (
    <Link
      href="/account/notifications"
      aria-label={ariaLabel ?? `Notifications, ${count} unread`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors duration-web-color hover:bg-surface-warm/40"
    >
      <Bell size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-text-on-accent tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
