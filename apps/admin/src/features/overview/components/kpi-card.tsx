'use client';

import { cn } from '@repo/ui';
import { fmtPct } from '@repo/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import * as React from 'react';

const KpiSparkline = dynamic(() => import('./kpi-sparkline'), { ssr: false });

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Percent change vs previous period. Sign drives color + arrow. */
  deltaPercent: number;
  /** Optional numeric color override (e.g. tint completion rate by threshold). */
  valueClassName?: string;
  sparkData?: number[];
  /** Sparkline stroke — default mint. Use status colors as needed. */
  sparkColor?: string;
}

/**
 * Small dense KPI card. Sparkline uses Recharts (theme-agnostic — we pass
 * the colour explicitly so we can swap palette per app later).
 */
export function KpiCard({
  label,
  value,
  deltaPercent,
  valueClassName,
  sparkData,
  sparkColor = 'rgb(var(--chart-1))',
}: KpiCardProps) {
  const up = deltaPercent >= 0;
  const points = React.useMemo(() => (sparkData ?? []).map((v) => ({ v })), [sparkData]);

  return (
    <div className="grid grid-rows-[auto_auto_2.5rem] gap-2 rounded-card border-hairline bg-surface p-4">
      <div className="text-caption-admin text-fg-subtle">{label}</div>
      <div>
        <div className={cn('text-display-admin tabular-nums', valueClassName ?? 'text-fg')}>
          {value}
        </div>
        <div
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-xs tabular-nums',
            up ? 'text-positive' : 'text-negative',
          )}
        >
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          <span>{fmtPct(Math.abs(deltaPercent), { digits: 1 })}</span>
          <span className="text-fg-subtle">vs. prev period</span>
        </div>
      </div>
      {points.length > 0 && (
        <div className="h-10 w-full">
          <KpiSparkline points={points} color={sparkColor} />
        </div>
      )}
    </div>
  );
}
