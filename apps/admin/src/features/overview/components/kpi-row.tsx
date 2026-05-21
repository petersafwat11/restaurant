'use client';

import { useAnalyticsOverview, useRevenueTimeseries } from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@repo/types';
import { Spinner } from '@repo/ui';
import { fmtInt, fmtPct, formatMoney } from '@repo/utils';
import * as React from 'react';
import { KpiCard } from './kpi-card';

interface KpiRowProps {
  period: AnalyticsPeriod;
  currency?: string;
}

/**
 * Five-card KPI strip. Numbers come from `analytics.overview`; sparklines
 * derive from `analytics.revenueTimeseries` so every card's trend reconciles
 * to the same underlying series (README §6 carry-over #2).
 */
export function KpiRow({ period, currency = 'USD' }: KpiRowProps) {
  const overview = useAnalyticsOverview({ period });
  const series = useRevenueTimeseries({
    period,
    granularity: period === 'today' ? 'hour' : 'day',
  });

  const sparkRevenue = React.useMemo(
    () => (series.data ?? []).map((p) => Number(p.revenue)),
    [series.data],
  );
  const sparkOrders = React.useMemo(() => (series.data ?? []).map((p) => p.orders), [series.data]);

  if (overview.isLoading || !overview.data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const o = overview.data;
  const completionRate = o.completionRate.value;
  const completionClass =
    completionRate >= 95 ? 'text-positive' : completionRate < 90 ? 'text-negative' : 'text-fg';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Revenue"
        value={formatMoney(o.revenue.value, currency)}
        deltaPercent={o.revenue.deltaPercent}
        sparkData={sparkRevenue}
        sparkColor="rgb(var(--chart-1))"
      />
      <KpiCard
        label="Orders"
        value={fmtInt(o.orders.value)}
        deltaPercent={o.orders.deltaPercent}
        sparkData={sparkOrders}
        sparkColor="rgb(var(--chart-2))"
      />
      <KpiCard
        label="Avg order value"
        value={formatMoney(o.aov.value, currency)}
        deltaPercent={o.aov.deltaPercent}
        sparkData={sparkRevenue.map((rev, i) => rev / Math.max(1, sparkOrders[i] ?? 1))}
        sparkColor="rgb(var(--chart-3))"
      />
      <KpiCard
        label="Completion rate"
        value={fmtPct(completionRate, { digits: 1 })}
        valueClassName={completionClass}
        deltaPercent={o.completionRate.delta}
        sparkData={sparkRevenue.slice(0, Math.floor(sparkRevenue.length / 2))}
        sparkColor="rgb(var(--chart-4))"
      />
      <KpiCard
        label="New customers"
        value={fmtInt(o.newCustomers.value)}
        deltaPercent={o.newCustomers.delta}
        sparkData={sparkOrders}
        sparkColor="rgb(var(--chart-5))"
      />
    </div>
  );
}
