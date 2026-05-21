'use client';

import { AuthFormShell } from '@/features/auth/components';
import { useVerifyEmail } from '@/features/auth/hooks';
import { Link } from '@/i18n/navigation';
import { Button, Spinner } from '@repo/ui';
import { AlertCircle, CheckCircle2, MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export default function VerifyEmailPage() {
  const t = useTranslations('admin.auth.verifyEmail');
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');
  const verify = useVerifyEmail();

  const ranRef = React.useRef(false);
  React.useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    verify.mutate({ token });
  }, [token, verify]);

  if (token) {
    if (verify.isPending || verify.isIdle) {
      return (
        <AuthFormShell title={t('verifying.title')} helper={t('verifying.helper')}>
          <div className="flex flex-col items-center gap-3 py-6 text-fg-muted">
            <Spinner size="lg" />
            <span className="text-small-admin">{t('verifying.working')}</span>
          </div>
        </AuthFormShell>
      );
    }

    if (verify.isError) {
      return (
        <AuthFormShell title={t('failed.title')} helper={t('failed.helper')}>
          <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{verify.error.message}</span>
          </div>
          <Link href="/login" className="mt-6 block">
            <Button variant="primary" size="lg" className="w-full">
              {t('failed.backToLogin')}
            </Button>
          </Link>
        </AuthFormShell>
      );
    }

    return (
      <AuthFormShell title={t('verified.title')} helper={t('verified.helper')}>
        <div className="flex flex-col items-center gap-3 rounded-md border border-positive/30 bg-positive/10 px-4 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-positive" />
          <span className="text-small-admin text-fg">{t('verified.allSet')}</span>
        </div>
        <Link href="/" className="mt-6 block">
          <Button variant="primary" size="lg" className="w-full">
            {t('verified.continue')}
          </Button>
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title={t('title')}
      helper={
        email ? t('helperWithEmail', { email: decodeURIComponent(email) }) : t('helperGeneric')
      }
      footer={
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-6 text-center">
        <MailCheck className="h-8 w-8 text-accent" />
        <p className="text-small-admin text-fg">{t('instruction')}</p>
      </div>
      {/* Resend not yet implemented server-side — endpoint missing in auth.controller.ts */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="mt-4 w-full"
        disabled
        title={t('resendComingSoon')}
      >
        {t('resend')}
      </Button>
    </AuthFormShell>
  );
}
