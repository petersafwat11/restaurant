'use client';

import { useLoyaltyAccount, useLoyaltyHistory } from '@/features/loyalty/hooks';
import { EmptyState, Spinner } from '@repo/ui';
import { Gift, Sparkles } from 'lucide-react';

export default function LoyaltyPage() {
  const accountQuery = useLoyaltyAccount();
  const historyQuery = useLoyaltyHistory();
  const account = accountQuery.data;
  const history = historyQuery.data?.items ?? [];

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-h2 text-fg">Loyalty</h1>
        <p className="mt-1 text-small text-fg-muted">
          Earn points on every order, redeem at checkout.
        </p>
      </header>

      {accountQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : !account ? (
        <EmptyState
          size="lg"
          icon={<Gift size={56} strokeWidth={1.25} />}
          title="Join loyalty"
          description="Your first order opens a loyalty account automatically."
          action={{ label: 'Browse menu', href: '/menu' }}
        />
      ) : (
        <>
          <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-caption uppercase tracking-wide text-fg-subtle">
                  Available points
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[48px] font-medium tabular-nums text-accent">
                    {account.points.toLocaleString()}
                  </span>
                  <span className="text-small text-fg-muted">pts</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-accent/[0.10] px-3 py-1.5">
                <Sparkles size={14} className="text-accent" />
                <span className="text-small font-medium text-accent">{account.tier}</span>
              </div>
            </div>
            {account.nextTier && account.pointsToNextTier != null && (
              <div className="mt-4 text-small text-fg-muted">
                {account.pointsToNextTier.toLocaleString()} more points to reach{' '}
                <strong className="text-fg">{account.nextTier}</strong>.
              </div>
            )}
            <div className="mt-3 text-small text-fg-muted">
              Lifetime:{' '}
              <strong className="text-fg">{account.lifetimePoints.toLocaleString()}</strong> pts.
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-h3 font-semibold text-fg">Activity</h2>
            {history.length === 0 ? (
              <p className="text-small text-fg-muted">No transactions yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-border/[var(--border-alpha)] bg-surface-2 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-small font-medium text-fg">{t.reason}</span>
                      <span className="text-[12px] text-fg-subtle">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums font-medium ${t.delta >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {t.delta > 0 ? '+' : ''}
                      {t.delta} pts
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
