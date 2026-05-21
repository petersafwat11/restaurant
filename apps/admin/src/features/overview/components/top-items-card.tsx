'use client';

import { useTopItems } from '@/features/analytics/hooks';
import type { AnalyticsPeriod } from '@repo/types';
import { Spinner, cn } from '@repo/ui';
import { fmtInt, formatMoney } from '@repo/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

interface TopItemsCardProps {
  period: AnalyticsPeriod;
  currency?: string;
}

type Tab = 'revenue' | 'qty';

export function TopItemsCard({ period, currency = 'USD' }: TopItemsCardProps) {
  const [tab, setTab] = React.useState<Tab>('revenue');
  const q = useTopItems({ period, limit: 5 });

  const items = React.useMemo(() => {
    const arr = [...(q.data ?? [])];
    arr.sort((a, b) =>
      tab === 'revenue' ? Number(b.revenue) - Number(a.revenue) : b.quantity - a.quantity,
    );
    return arr;
  }, [q.data, tab]);

  return (
    <div className="flex h-[320px] flex-col rounded-card border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2-admin text-fg">Top items</h2>
        <div className="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5 text-xs">
          {(['revenue', 'qty'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-sm px-2 py-1 transition-colors',
                tab === t ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {t === 'revenue' ? 'By revenue' : 'By quantity'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-caption-admin text-fg-subtle">
            <tr>
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="text-fg">
            {q.isLoading ? (
              <tr>
                <td colSpan={3} className="py-10">
                  <div className="flex justify-center">
                    <Spinner size="lg" />
                  </div>
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.menuItemId} tabIndex={0} className="border-t-hairline">
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-surface-2 text-xs font-medium text-fg-muted">
                        {it.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-fg">{it.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmtInt(it.quantity)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(it.revenue, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 border-t-hairline pt-3">
        <Link
          href="/reports/exports"
          className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
        >
          View full report <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
