'use client';

import { useOrdersByStatus } from '@/features/analytics/hooks';
import type { AnalyticsPeriod, OrderStatus } from '@repo/types';
import { STATUS_TOKENS } from '@repo/ui';
import { fmtInt } from '@repo/utils';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

const StatusDonutPie = dynamic(() => import('./status-donut-pie'), { ssr: false });

interface StatusDonutProps {
  period: AnalyticsPeriod;
}

export function StatusDonut({ period }: StatusDonutProps) {
  const t = useTranslations('admin.dashboard.statusDonut');
  const tPeriod = useTranslations('admin.dashboard.period');
  const tStatus = useTranslations('shared.orderStatus');
  const q = useOrdersByStatus({ period });
  const items = React.useMemo(
    () =>
      (q.data ?? []).map((row) => {
        const tok = STATUS_TOKENS[row.status as OrderStatus];
        return { ...row, varRef: tok?.varRef ?? 'rgb(var(--fg-subtle))' };
      }),
    [q.data],
  );
  const total = items.reduce((s, r) => s + r.count, 0);
  const periodLabel = tPeriod(period);

  return (
    <div className="flex h-[360px] flex-col rounded-card border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2-admin text-fg">{t('title')}</h2>
        <span className="text-caption-admin text-fg-subtle">{periodLabel}</span>
      </div>

      <div className="relative h-[180px]">
        <StatusDonutPie items={items} total={total} />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-h1-admin tabular-nums text-fg">{fmtInt(total)}</div>
            <div className="text-xs text-fg-subtle">{t('centerLabel', { period: periodLabel })}</div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1.5 overflow-y-auto">
        {items.map((it) => {
          const pct = total > 0 ? (it.count / total) * 100 : 0;
          return (
            <div
              key={it.status}
              className="grid grid-cols-[auto_1fr_auto_3rem] items-center gap-2 text-xs"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: it.varRef }}
              />
              <span className="text-fg-muted">{tStatus(it.status as OrderStatus)}</span>
              <span className="text-right tabular-nums text-fg">{fmtInt(it.count)}</span>
              <span className="text-right tabular-nums text-fg-subtle">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <table className="sr-only" aria-label={t('tableAriaLabel')}>
        <thead>
          <tr>
            <th>{t('tableStatus')}</th>
            <th>{t('tableCount')}</th>
            <th>{t('tablePercent')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const pct = total > 0 ? (it.count / total) * 100 : 0;
            return (
              <tr key={it.status}>
                <td>{tStatus(it.status as OrderStatus)}</td>
                <td>{it.count}</td>
                <td>{pct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
