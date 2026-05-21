'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import {
  KpiRow,
  LivePanel,
  RecentOrdersFeed,
  RevenueChart,
  StatusDonut,
  TopItemsCard,
} from '@/features/overview/components';
import type { AnalyticsPeriod } from '@repo/types';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard');
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('today');

  usePageHeader({
    title: t('title'),
    showDateRange: true,
    rangeId: period,
    onRangeChange: (r) => setPeriod(r.id),
  });

  return (
    <div className="flex flex-col gap-4">
      <KpiRow period={period} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart period={period} />
        </div>
        <StatusDonut period={period} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TopItemsCard period={period} />
        </div>
        <LivePanel period={period} />
      </div>

      <RecentOrdersFeed />
    </div>
  );
}
