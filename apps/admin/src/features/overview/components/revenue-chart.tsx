'use client';

import { useRevenueTimeseries } from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@repo/types';
import { cn } from '@repo/ui';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

const RevenueAreaChart = dynamic(() => import('./revenue-area-chart'), { ssr: false });

interface RevenueChartProps {
  period: AnalyticsPeriod;
  currency?: string;
}

interface ChartPoint {
  t: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({ period, currency = 'USD' }: RevenueChartProps) {
  const t = useTranslations('admin.dashboard.revenue');
  const [showOrders, setShowOrders] = React.useState(false);
  const series = useRevenueTimeseries({
    period,
    granularity: period === 'today' ? 'hour' : 'day',
  });

  const points: ChartPoint[] = React.useMemo(
    () =>
      (series.data ?? []).map((p) => ({
        t: p.bucket,
        revenue: Number(p.revenue),
        orders: p.orders,
      })),
    [series.data],
  );

  const xInterval = period === 'today' ? 2 : period === '7d' ? 0 : 4;

  return (
    <div className="flex h-[360px] flex-col rounded-card border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2-admin text-fg">{t('title')}</h2>
        <div role="group" aria-label={t('seriesAriaLabel')} className="flex items-center gap-1 text-xs">
          <button
            type="button"
            aria-pressed
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-fg"
          >
            <span className="h-2 w-2 rounded-full bg-chart-1" /> {t('seriesRevenue')}
          </button>
          <button
            type="button"
            aria-pressed={showOrders}
            onClick={() => setShowOrders((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors',
              showOrders ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-chart-2" /> {t('seriesOrders')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <RevenueAreaChart
          points={points}
          showOrders={showOrders}
          xInterval={xInterval}
          currency={currency}
        />
      </div>

      {/* a11y summary — README §5 a11y audit */}
      <table className="sr-only" aria-label={t('tableAriaLabel')}>
        <thead>
          <tr>
            <th>{t('tableTime')}</th>
            <th>{t('tableRevenue')}</th>
            <th>{t('tableOrders')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.t}>
              <td>{p.t}</td>
              <td>{p.revenue}</td>
              <td>{p.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
