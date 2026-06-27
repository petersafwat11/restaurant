'use client';

import {
  useAccountDeletionStatus,
  useCancelAccountDeletion,
  useConfirmAccountDeletion,
  useRequestAccountDeletion,
} from '@/features/account/hooks';
import { useRestaurant } from '@/features/restaurants/hooks/use-restaurant';
import { FormField, Spinner } from '@repo/ui';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export default function DeleteAccountPage() {
  const t = useTranslations('web.accountDeletion');
  const format = useFormatter();
  const searchParams = useSearchParams();

  const statusQuery = useAccountDeletionStatus();
  const requestMutation = useRequestAccountDeletion();
  const confirmMutation = useConfirmAccountDeletion();
  const cancelMutation = useCancelAccountDeletion();
  const restaurant = useRestaurant();

  const [password, setPassword] = React.useState('');
  const [reason, setReason] = React.useState('');

  // Email-confirmation deep link: /account/delete?token=… → confirm once.
  const token = searchParams?.get('token') ?? null;
  const confirmedRef = React.useRef(false);
  React.useEffect(() => {
    if (token && !confirmedRef.current) {
      confirmedRef.current = true;
      confirmMutation.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const status = statusQuery.data;
  const graceDays = status?.graceDays ?? 7;
  const privacyEmail = restaurant.data?.legal?.privacyEmail ?? null;

  if (statusQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const onRequestPassword = (e: React.FormEvent) => {
    e.preventDefault();
    requestMutation.mutate({
      method: 'password',
      currentPassword: password,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  };

  const onRequestEmail = () => {
    requestMutation.mutate({
      method: 'email',
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  };

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="mt-1 text-small text-fg-muted">{t('intro')}</p>
      </header>

      {/* Consequences — always visible. */}
      <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-5">
        <h2 className="text-small font-semibold text-fg">{t('consequences.heading')}</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-small text-fg-muted">
          <li>{t('consequences.sessions')}</li>
          <li>{t('consequences.profile')}</li>
          <li>{t('consequences.retained')}</li>
          <li>{t('consequences.grace', { graceDays })}</li>
          <li>{t('consequences.irreversible')}</li>
        </ul>
      </div>

      {/* COMPLETED — terminal. */}
      {status?.status === 'COMPLETED' && (
        <StatusCard tone="muted" title={t('status.completedHeading')}>
          {t('status.completed')}
        </StatusCard>
      )}

      {/* PENDING — scheduled; offer cancel. */}
      {status?.status === 'PENDING' && (
        <StatusCard tone="warning" title={t('status.pendingHeading')}>
          <p>
            {t('status.pending', {
              date: status.scheduledAt
                ? format.dateTime(new Date(status.scheduledAt), {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })
                : '',
            })}
          </p>
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="mt-3 inline-flex h-11 items-center justify-center self-start rounded-button border border-border/[var(--border-strong-alpha)] bg-surface-2 px-5 text-[15px] font-medium text-fg transition-colors hover:bg-surface-warm/40 disabled:opacity-60"
          >
            {cancelMutation.isPending ? t('actions.cancelling') : t('actions.cancel')}
          </button>
        </StatusCard>
      )}

      {/* Email confirmation link sent — check inbox. */}
      {status?.status !== 'PENDING' &&
        status?.status !== 'COMPLETED' &&
        status?.confirmationEmailSent && (
          <StatusCard tone="info" title={t('status.emailSentHeading')}>
            {t('status.emailSent')}
          </StatusCard>
        )}

      {/* CANCELLED — informational; still allow a fresh request below. */}
      {status?.status === 'CANCELLED' && !status?.confirmationEmailSent && (
        <StatusCard tone="muted" title={t('status.cancelledHeading')}>
          {t('status.cancelled')}
        </StatusCard>
      )}

      {/* Request form — shown unless already scheduled or anonymised. */}
      {status?.status !== 'PENDING' && status?.status !== 'COMPLETED' && (
        <form onSubmit={onRequestPassword} className="flex flex-col gap-4" noValidate>
          <FormField
            id="del-password"
            label={t('password.label')}
            size="lg"
            helper={t('password.help')}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder={t('password.placeholder')}
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>

          <FormField id="del-reason" label={t('reasonLabel')} size="lg">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t('reasonPlaceholder')}
              className="w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 py-3 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={requestMutation.isPending || password.length === 0}
              className="inline-flex h-12 items-center justify-center rounded-button bg-danger px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {requestMutation.isPending ? t('actions.requesting') : t('actions.request')}
            </button>

            {/* No-password (OTP/social) fallback: email a confirmation link. */}
            <button
              type="button"
              onClick={onRequestEmail}
              disabled={requestMutation.isPending}
              className="inline-flex h-12 items-center justify-center rounded-button border border-border/[var(--border-strong-alpha)] bg-surface-2 px-6 text-[15px] font-medium text-fg transition-colors hover:bg-surface-warm/40 disabled:opacity-60"
            >
              {requestMutation.isPending ? t('actions.sending') : t('actions.sendEmail')}
            </button>
          </div>

          <p className="text-[12px] text-fg-subtle">{t('noPassword.note')}</p>
        </form>
      )}

      {/* Guest / non-account fallback — text only. */}
      {privacyEmail && (
        <p className="border-t border-border/[var(--border-alpha)] pt-4 text-[12px] text-fg-subtle">
          {t('guestNote', { email: privacyEmail })}
        </p>
      )}
    </section>
  );
}

function StatusCard({
  tone,
  title,
  children,
}: {
  tone: 'warning' | 'info' | 'muted';
  title: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-warning/40 bg-warning/[0.08]'
      : tone === 'info'
        ? 'border-accent/40 bg-accent/[0.06]'
        : 'border-border/[var(--border-alpha)] bg-surface-2';
  return (
    <div className={`flex flex-col rounded-card border p-5 ${toneClass}`}>
      <h2 className="text-small font-semibold text-fg">{title}</h2>
      <div className="mt-2 text-small text-fg-muted">{children}</div>
    </div>
  );
}
