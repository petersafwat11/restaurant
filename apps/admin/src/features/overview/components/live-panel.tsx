'use client';

import { useAnalyticsOverview } from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@repo/types';
import { fmtPrep } from '@repo/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

interface LivePanelProps {
  /** Period is forwarded to overview to keep numbers aligned with KPIs. */
  period: AnalyticsPeriod;
}

/**
 * Live operational counters. Active orders + avg prep come from
 * analytics.overview. "In kitchen" is derived from orders-by-status's
 * PREPARING bucket — keeps the live panel's numbers reconciling with the
 * donut (README §6 carry-over #2).
 */
export function LivePanel({ period }: LivePanelProps) {
  const overview = useAnalyticsOverview({ period });
  const live = overview.data;

  return (
    <div className="flex h-[320px] flex-col rounded-card border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-h2-admin text-fg">
          <span aria-hidden className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
            <span className="relative h-2 w-2 rounded-full bg-accent" />
          </span>
          Live
        </h2>
        <span className="text-caption-admin text-fg-subtle">Realtime</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Stat
          label="Active orders"
          sub="Confirmed → Out for delivery"
          value={live?.liveOrdersCount ?? 0}
        />
        <Stat
          label="Avg prep time"
          sub="Confirmed → Ready"
          value={live?.avgPrepMinutes.value != null ? fmtPrep(live.avgPrepMinutes.value) : '—'}
        />
        <Stat
          label="Repeat rate"
          sub={`${PERIOD_LABEL[period]} · returning customers`}
          value={live?.repeatRate.value != null ? `${live.repeatRate.value.toFixed(1)}%` : '—'}
        />
      </div>

      <div className="mt-3 flex gap-2 border-t-hairline pt-3">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
        >
          Open orders <ArrowRight size={12} />
        </Link>
        <Link
          href="/orders/kitchen"
          className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
        >
          Kitchen view <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

const PERIOD_LABEL: Record<AnalyticsPeriod, string> = {
  today: 'Today',
  '7d': '7 days',
  '30d': '30 days',
  custom: 'Custom',
};

function Stat({
  label,
  sub,
  value,
}: {
  label: string;
  sub?: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b-hairline py-2 last:border-b-0">
      <div>
        <div className="text-sm text-fg">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-fg-subtle">{sub}</div>}
      </div>
      <div className="text-h2-admin tabular-nums text-fg">{value}</div>
    </div>
  );
}
