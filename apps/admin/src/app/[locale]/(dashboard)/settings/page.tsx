'use client';

import { PwaSettingsCard } from '@/components/pwa/pwa-settings-card';
import { usePageHeader } from '@/components/shell/page-title-context';
import { FinancialsSettingsCard, ReservationsSettingsCard } from '@/features/settings/components';
import { useRestaurantSettings } from '@/features/settings/hooks';
import { Link } from '@/i18n/navigation';
import type { HolidayDto } from '@repo/types';
import { EmptyState, PageSpinner, SettingsSectionCard } from '@repo/ui';
import { Calendar, Clock, Globe, ReceiptText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

function summarizeHolidays(holidays: HolidayDto[]): {
  upcoming: number;
  nextLabel: string | null;
} {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today);
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return {
    upcoming: upcoming.length,
    nextLabel: upcoming[0]?.label ?? null,
  };
}

function HubCard({
  icon,
  title,
  preview,
  href,
  manageLabel,
}: {
  icon: React.ReactNode;
  title: string;
  preview: React.ReactNode;
  href: string;
  manageLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-border/[var(--border-alpha)] bg-surface p-6 transition-colors hover:border-border/[var(--border-strong-alpha)] hover:bg-surface-2"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-button bg-accent-muted text-accent">
          {icon}
        </div>
        <h3 className="text-h2 font-semibold text-fg">{title}</h3>
      </div>
      <div className="flex-1 text-small text-fg-muted">{preview}</div>
      <div className="mt-6 text-small text-accent group-hover:text-accent-hover">{manageLabel}</div>
    </Link>
  );
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings.general');
  usePageHeader({ title: t('title') });
  const { data, isLoading, isError, error, refetch } = useRestaurantSettings();

  if (isLoading) {
    return <PageSpinner label={t('loading')} />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={t('error.title')}
        description={error?.message ?? t('error.description')}
        action={{ label: t('error.retry'), onClick: () => refetch() }}
        size="lg"
      />
    );
  }

  const s = data;
  const holidaySummary = summarizeHolidays(s.holidayDates);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HubCard
          icon={<Clock className="h-5 w-5" />}
          title={t('hub.hours.title')}
          href="/settings/hours"
          manageLabel={t('hub.manage')}
          preview={<p>{t('hub.hours.preview')}</p>}
        />
        <HubCard
          icon={<Calendar className="h-5 w-5" />}
          title={t('hub.holidays.title')}
          href="/settings/holidays"
          manageLabel={t('hub.manage')}
          preview={
            <p>
              <span className="text-fg">
                {t('hub.holidays.preview', { count: holidaySummary.upcoming })}
              </span>
              {holidaySummary.nextLabel
                ? t('hub.holidays.next', { label: holidaySummary.nextLabel })
                : ''}
              {t('hub.holidays.trailing')}
            </p>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PwaSettingsCard />
        <FinancialsSettingsCard settings={s} />
        <ReservationsSettingsCard settings={s} />

        <SettingsSectionCard
          id="locale"
          title={t('locale.title')}
          description={t('locale.description')}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">{t('locale.timezone')}</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.timezone}
            </code>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">{t('locale.currency')}</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.currency}
            </code>
          </div>
          <p className="border-t border-border/[var(--border-alpha)] pt-3 text-small text-fg-muted">
            {t.rich('locale.editLink', {
              link: (chunks) => (
                <Link className="text-accent hover:underline" href="/restaurant">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
