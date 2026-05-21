'use client';

import { useReferralList, useReferralMe } from '@/features/referrals/hooks';
import { Spinner } from '@repo/ui';
import { Check, Copy, Users } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const meQuery = useReferralMe();
  const listQuery = useReferralList();
  const me = meQuery.data;
  const list = listQuery.data?.items ?? [];
  const [copied, setCopied] = React.useState(false);

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-h2 text-fg">Referrals</h1>
        <p className="mt-1 text-small text-fg-muted">
          Share your code — both of you earn loyalty points on their first order.
        </p>
      </header>

      {meQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : !me ? (
        <p className="text-fg-muted">Sign in to get your referral code.</p>
      ) : (
        <>
          <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6">
            <div className="text-caption uppercase tracking-wide text-fg-subtle">Your code</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-[36px] font-medium tracking-wider tabular-nums text-fg">
                {me.code}
              </span>
              <button
                type="button"
                onClick={() => copy(me.code)}
                aria-label="Copy code"
                className="grid h-9 w-9 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-warm/60 hover:text-fg"
              >
                {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-small">
              <span className="text-fg-muted">Or share your link:</span>
              <button
                type="button"
                onClick={() => copy(me.link)}
                className="self-start rounded-md border border-border/[var(--border-strong-alpha)] bg-surface px-3 py-1.5 text-fg hover:border-accent/40"
              >
                {me.link}
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/[var(--border-alpha)] pt-4">
              <div>
                <div className="text-caption uppercase tracking-wide text-fg-subtle">Invited</div>
                <div className="mt-1 font-display text-h3 tabular-nums text-fg">
                  {me.totalReferred}
                </div>
              </div>
              <div>
                <div className="text-caption uppercase tracking-wide text-fg-subtle">Completed</div>
                <div className="mt-1 font-display text-h3 tabular-nums text-fg">
                  {me.totalCompleted}
                </div>
              </div>
              <div>
                <div className="text-caption uppercase tracking-wide text-fg-subtle">Earned</div>
                <div className="mt-1 font-display text-h3 tabular-nums text-accent">
                  {me.pointsEarned.toLocaleString()} pts
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-h3 font-semibold text-fg">Recent referrals</h2>
            {list.length === 0 ? (
              <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-8 text-center">
                <Users size={40} strokeWidth={1.25} className="mx-auto text-fg-subtle" />
                <p className="mt-3 text-small text-fg-muted">No referrals yet — share your code.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-border/[var(--border-alpha)] bg-surface-2 px-4 py-3 text-small"
                  >
                    <span className="text-fg">{r.refereeName ?? 'Friend'}</span>
                    <span className="text-fg-subtle">
                      {new Date(r.createdAt).toLocaleDateString()}
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
