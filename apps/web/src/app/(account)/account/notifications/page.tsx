'use client';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks';
import { EmptyState, Spinner } from '@repo/ui';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-h2 text-fg">Notifications</h1>
          <p className="mt-1 text-small text-fg-muted">
            Order updates, loyalty milestones, and promotions.
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-small text-accent hover:underline disabled:opacity-60"
          >
            Mark all read
          </button>
        )}
      </header>

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<Bell size={56} strokeWidth={1.25} />}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const isRead = !!n.readAt;
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-card border p-4 ${
                  isRead
                    ? 'border-border/[var(--border-alpha)] bg-surface-2'
                    : 'border-accent/30 bg-accent/[0.04]'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isRead ? 'bg-fg-disabled' : 'bg-accent'
                  }`}
                />
                <div className="flex-1">
                  <div className="text-small font-semibold text-fg">{n.title}</div>
                  <div className="mt-0.5 text-small text-fg-muted">{n.body}</div>
                  <div className="mt-1 text-[12px] text-fg-subtle">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(n.id)}
                    className="text-[12px] text-accent hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
