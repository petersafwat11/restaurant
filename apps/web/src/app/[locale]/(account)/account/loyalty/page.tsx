'use client';

import { useLoyaltyAccount, useLoyaltyHistory } from '@/features/loyalty/hooks';
import { EmptyState, Spinner } from '@repo/ui';
import { Gift, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LoyaltyPage() {
  const t = useTranslations('web.account.loyalty');
  const accountQuery = useLoyaltyAccount();
  const historyQuery = useLoyaltyHistory();
  const account = accountQuery.data;
  const history = historyQuery.data?.items ?? [];

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="mt-1 text-small text-fg-muted">{t('subtitle')}</p>
      </header>

      {accountQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : !account ? (
        <EmptyState
          size="lg"
          icon={<Gift size={56} strokeWidth={1.25} />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), href: '/menu' }}
        />
      ) : (
        <>
          <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-caption uppercase tracking-wide text-fg-subtle">
                  {t('availablePoints')}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[48px] font-medium tabular-nums text-accent">
                    {account.points.toLocaleString()}
                  </span>
                  <span className="text-small text-fg-muted">{t('pointsUnit')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-accent/[0.10] px-3 py-1.5">
                <Sparkles size={14} className="text-accent" />
                <span className="text-small font-medium text-accent">{account.tier}</span>
              </div>
            </div>
            {account.nextTier && account.pointsToNextTier != null && (
              <div className="mt-4 text-small text-fg-muted">
                {t.rich('tierProgress', {
                  points: account.pointsToNextTier.toLocaleString(),
                  tier: account.nextTier,
                  strong: (chunks) => <strong className="text-fg">{chunks}</strong>,
                })}
              </div>
            )}
            <div className="mt-3 text-small text-fg-muted">
              {t.rich('lifetime', {
                points: account.lifetimePoints.toLocaleString(),
                strong: (chunks) => <strong className="text-fg">{chunks}</strong>,
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-h3 font-semibold text-fg">{t('activity')}</h2>
            {history.length === 0 ? (
              <p className="text-small text-fg-muted">{t('noActivity')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between rounded-md border border-border/[var(--border-alpha)] bg-surface-2 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-small font-medium text-fg">{tx.reason}</span>
                      <span className="text-[12px] text-fg-subtle">
                        {new Date(tx.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums font-medium ${tx.delta >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {tx.delta > 0 ? '+' : ''}
                      {tx.delta} {t('pointsUnit')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
