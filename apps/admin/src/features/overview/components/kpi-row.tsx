'use client';

import { useAnalyticsOverview, useRevenueTimeseries } from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@repo/types';
import { Spinner } from '@repo/ui';
import { fmtInt, fmtPct, formatMoney } from '@repo/utils';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { KpiCard } from './kpi-card';

interface KpiRowProps {
  period: AnalyticsPeriod;
  from?: string;
  to?: string;
  currency?: string;
}

/**
 * Five-card KPI strip. Numbers come from `analytics.overview`; sparklines
 * derive from `analytics.revenueTimeseries` so every card's trend reconciles
 * to the same underlying series (README §6 carry-over #2).
 */
export function KpiRow({ period, from, to, currency = 'USD' }: KpiRowProps) {
  const t = useTranslations('admin.dashboard.kpi');
  const overview = useAnalyticsOverview({ period, from, to });
  const series = useRevenueTimeseries({
    period,
    from,
    to,
    granularity: period === 'today' ? 'hour' : 'day',
  });

  const sparkRevenue = React.useMemo(
    () => (series.data ?? []).map((p) => Number(p.revenue)),
    [series.data],
  );
  const sparkOrders = React.useMemo(() => (series.data ?? []).map((p) => p.orders), [series.data]);
  const sparkAov = React.useMemo(
    () => (series.data ?? []).map((p) => (p.orders > 0 ? Number(p.revenue) / p.orders : 0)),
    [series.data],
  );
  const sparkCompletionRate = React.useMemo(
    () => (series.data ?? []).map((p) => (p.completionRate ?? 1) * 100),
    [series.data],
  );
  const sparkNewCustomers = React.useMemo(
    () => (series.data ?? []).map((p) => p.newCustomers ?? 0),
    [series.data],
  );

  if (overview.isLoading || !overview.data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const o = overview.data;
  const completionPct = o.completionRate.value * 100;
  const completionClass =
    completionPct >= 95 ? 'text-positive' : completionPct < 90 ? 'text-negative' : 'text-fg';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label={t('revenue')}
        value={formatMoney(o.revenue.value, currency)}
        deltaPercent={o.revenue.deltaPercent}
        sparkData={sparkRevenue}
        sparkColor="rgb(var(--chart-1))"
      />
      <KpiCard
        label={t('orders')}
        value={fmtInt(o.orders.value)}
        deltaPercent={o.orders.deltaPercent}
        sparkData={sparkOrders}
        sparkColor="rgb(var(--chart-2))"
      />
      <KpiCard
        label={t('aov')}
        value={formatMoney(o.aov.value, currency)}
        deltaPercent={o.aov.deltaPercent}
        sparkData={sparkAov}
        sparkColor="rgb(var(--chart-3))"
      />
      <KpiCard
        label={t('completionRate')}
        value={fmtPct(completionPct, { digits: 1 })}
        valueClassName={completionClass}
        deltaPercent={o.completionRate.deltaPercent ?? o.completionRate.delta * 100}
        sparkData={sparkCompletionRate}
        sparkColor="rgb(var(--chart-4))"
      />
      <KpiCard
        label={t('newCustomers')}
        value={fmtInt(o.newCustomers.value)}
        deltaPercent={o.newCustomers.deltaPercent ?? (o.newCustomers.delta > 0 ? 100 : 0)}
        sparkData={sparkNewCustomers}
        sparkColor="rgb(var(--chart-5))"
      />
    </div>
  );
}
