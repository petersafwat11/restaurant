'use client';

import { useOrders } from '@/features/orders/hooks';
import { Link } from '@/i18n/navigation';
import { EmptyState, Spinner } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { ArrowRight, Receipt } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-fg-subtle/10 text-fg-subtle',
  CONFIRMED: 'bg-info/10 text-info',
  PREPARING: 'bg-warning/10 text-warning',
  READY: 'bg-positive/10 text-positive',
  OUT_FOR_DELIVERY: 'bg-info/10 text-info',
  DELIVERED: 'bg-positive/10 text-positive',
  COMPLETED: 'bg-positive/10 text-positive',
  CANCELLED: 'bg-negative/10 text-negative',
  REFUNDED: 'bg-negative/10 text-negative',
};

export default function OrdersPage() {
  const t = useTranslations('web.account.orders');
  const tStatus = useTranslations('shared.orderStatus');
  const format = useFormatter();
  const query = useOrders();
  const orders = query.data?.items ?? [];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="mt-1 text-small text-fg-muted">{t('subtitle')}</p>
      </header>

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<Receipt size={56} strokeWidth={1.25} />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), href: '/menu' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="group flex items-center gap-4 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-4 transition-colors hover:border-accent/40"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-body-l font-medium text-fg">
                      {o.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[o.status] ?? ''}`}
                    >
                      {tStatus(o.status)}
                    </span>
                  </div>
                  <div className="text-small text-fg-muted">
                    {t('summaryLine', {
                      type: t(`type.${o.type}`),
                      items: t('itemCount', { count: o.itemCount }),
                      date: format.dateTime(new Date(o.createdAt), {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium tabular-nums text-fg">
                    {formatMoney(o.grandTotal, o.currency)}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
