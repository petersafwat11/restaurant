'use client';

import { useVerifyEmail } from '@/features/auth/hooks';
import { Link } from '@/i18n/navigation';
import { Spinner } from '@repo/ui';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Suspense } from 'react';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const t = useTranslations('web.auth.verifyEmail');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const verify = useVerifyEmail();
  const [status, setStatus] = React.useState<'pending' | 'ok' | 'error'>('pending');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    verify
      .mutateAsync({ token })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner size="xl" />
        <h1 className="font-display text-h3 text-fg">{t('pending.title')}</h1>
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-positive/10 text-positive">
          <Check size={24} strokeWidth={2} />
        </span>
        <h1 className="font-display text-h3 text-fg">{t('success.title')}</h1>
        <p className="text-small text-fg-muted">{t('success.description')}</p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent hover:bg-accent-hover"
        >
          {t('success.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-negative/10 text-negative">
        <X size={24} strokeWidth={2} />
      </span>
      <h1 className="font-display text-h3 text-fg">{t('error.title')}</h1>
      <p className="text-small text-fg-muted">{t('error.description')}</p>
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg hover:bg-surface-warm/40"
      >
        {t('error.backToLogin')}
      </Link>
    </div>
  );
}
