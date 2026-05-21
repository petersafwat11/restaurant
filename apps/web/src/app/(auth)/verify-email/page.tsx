'use client';

import { useVerifyEmail } from '@/features/auth/hooks';
import { Spinner } from '@repo/ui';
import { Check, X } from 'lucide-react';
import Link from 'next/link';
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
        <h1 className="font-display text-h3 text-fg">Verifying your email…</h1>
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-positive/10 text-positive">
          <Check size={24} strokeWidth={2} />
        </span>
        <h1 className="font-display text-h3 text-fg">Email verified</h1>
        <p className="text-small text-fg-muted">You're all set. Sign in to start ordering.</p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-negative/10 text-negative">
        <X size={24} strokeWidth={2} />
      </span>
      <h1 className="font-display text-h3 text-fg">Verification failed</h1>
      <p className="text-small text-fg-muted">
        This link is invalid or expired. Try requesting a new one from your account.
      </p>
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg hover:bg-surface-warm/40"
      >
        Back to sign in
      </Link>
    </div>
  );
}
