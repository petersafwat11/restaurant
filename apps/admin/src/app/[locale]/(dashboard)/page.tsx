'use client';

import type { DateRange } from '@/components/shell/date-range-segmented';
import { usePageHeader } from '@/components/shell/page-title-context';
import {
  KpiRow,
  LivePanel,
  RecentOrdersFeed,
  RevenueChart,
  StatusDonut,
  TopItemsCard,
} from '@/features/overview/components';
import { useRestaurantSettings } from '@/features/settings/hooks';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard');
  const [dateRange, setDateRange] = React.useState<DateRange>({ id: 'today' });
  const { data: settings } = useRestaurantSettings();
  const currency = settings?.currency ?? 'USD';

  usePageHeader({
    title: t('title'),
    showDateRange: true,
    range: dateRange,
    onRangeChange: (r) => setDateRange(r),
  });

  const fromIso = dateRange.from
    ? new Date(`${dateRange.from}T00:00:00.000Z`).toISOString()
    : undefined;
  const toIso = dateRange.to ? new Date(`${dateRange.to}T23:59:59.999Z`).toISOString() : undefined;

  return (
    <div className="flex flex-col gap-4">
      <KpiRow period={dateRange.id} from={fromIso} to={toIso} currency={currency} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart period={dateRange.id} from={fromIso} to={toIso} currency={currency} />
        </div>
        <StatusDonut period={dateRange.id} from={fromIso} to={toIso} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopItemsCard period={dateRange.id} from={fromIso} to={toIso} currency={currency} />
        </div>
        <LivePanel period={dateRange.id} from={fromIso} to={toIso} />
      </div>

      <RecentOrdersFeed />
    </div>
  );
}
