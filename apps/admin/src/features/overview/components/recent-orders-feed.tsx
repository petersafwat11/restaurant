'use client';

import { useAdminOrders } from '@/features/orders/hooks';
import { Link } from '@/i18n/navigation';
import { RelativeTime, STATUS_TOKENS, Spinner, StatusPill, TypeBadge, cn } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Compact feed of the 8 most-recent orders. Phase 2.2 will hook this up to
 * the realtime socket so new orders fade-in at the top; for Overview we read
 * the static snapshot.
 */
export function RecentOrdersFeed() {
  const t = useTranslations('admin.dashboard.recentOrders');
  const tType = useTranslations('admin.dashboard.orderType');
  const q = useAdminOrders({ limit: 8 });
  const rows = q.data?.items ?? [];

  return (
    <div className="rounded-card border-hairline bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-h2-admin text-fg">{t('title')}</h2>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
        >
          {t('viewAll')} <ArrowRight size={12} />
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-caption-admin text-fg-subtle">
          <tr>
            <th className="border-y-hairline px-4 py-2 font-medium">{t('colOrderNumber')}</th>
            <th className="border-y-hairline px-4 py-2 font-medium">{t('colCustomer')}</th>
            <th className="border-y-hairline px-4 py-2 font-medium">{t('colItems')}</th>
            <th className="border-y-hairline px-4 py-2 font-medium">{t('colType')}</th>
            <th className="border-y-hairline px-4 py-2 font-medium">{t('colStatus')}</th>
            <th className="border-y-hairline px-4 py-2 text-right font-medium">{t('colTotal')}</th>
            <th className="border-y-hairline px-4 py-2 text-right font-medium">{t('colPlaced')}</th>
          </tr>
        </thead>
        <tbody className="text-fg">
          {q.isLoading ? (
            <tr>
              <td colSpan={7} className="px-4 py-10">
                <div className="flex justify-center">
                  <Spinner size="lg" />
                </div>
              </td>
            </tr>
          ) : (
            rows.map((o) => {
              const typeLabel = tType(o.type as 'DELIVERY' | 'PICKUP' | 'DINE_IN');
              return (
                <tr key={o.id} tabIndex={0} className={cn('transition-colors hover:bg-surface-2')}>
                  <td className="border-b-hairline px-4 py-2.5">
                    <span className="tabular-nums text-fg">{o.orderNumber}</span>
                  </td>
                  <td className="border-b-hairline px-4 py-2.5">{o.customerName ?? '—'}</td>
                  <td className="border-b-hairline px-4 py-2.5 text-fg-muted">
                    <span className="text-fg-subtle">{o.itemCount} </span>
                    {t('items', { count: o.itemCount })}
                  </td>
                  <td className="border-b-hairline px-4 py-2.5">
                    <TypeBadge label={typeLabel.toUpperCase()} />
                  </td>
                  <td className="border-b-hairline px-4 py-2.5">
                    <StatusPill status={o.status} tokens={STATUS_TOKENS} size="sm" />
                  </td>
                  <td className="border-b-hairline px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(o.grandTotal, o.currency)}
                  </td>
                  <td className="border-b-hairline px-4 py-2.5 text-right text-fg-subtle">
                    <RelativeTime value={o.createdAt} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {!q.isLoading && rows.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-fg-subtle">{t('empty')}</div>
      )}
    </div>
  );
}
