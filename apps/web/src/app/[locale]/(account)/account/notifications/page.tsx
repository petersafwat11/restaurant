'use client';

import { NotificationPreferences } from '@/features/notifications/components/notification-preferences';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks';
import { EmptyState, Spinner } from '@repo/ui';
import { Bell, Settings } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

export default function NotificationsPage() {
  const t = useTranslations('web.account.notifications');
  const format = useFormatter();
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [showPrefs, setShowPrefs] = React.useState(false);

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
          <p className="mt-1 text-small text-fg-muted">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-small text-accent hover:underline disabled:opacity-60"
            >
              {t('markAllRead')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrefs((s) => !s)}
            aria-expanded={showPrefs}
            aria-label={t('prefs.toggle')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-warm/40 hover:text-fg"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {showPrefs && <NotificationPreferences />}

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<Bell size={56} strokeWidth={1.25} />}
          title={t('empty.title')}
          description={t('empty.description')}
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
                    {format.dateTime(new Date(n.createdAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(n.id)}
                    className="text-[12px] text-accent hover:underline"
                  >
                    {t('markRead')}
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
