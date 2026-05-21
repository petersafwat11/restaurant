'use client';

import { AuthFormShell } from '@/features/auth/components';
import { useVerifyEmail } from '@/features/auth/hooks';
import { Button, Spinner } from '@repo/ui';
import { AlertCircle, CheckCircle2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export default function VerifyEmailPage() {
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
        <AuthFormShell
          title="Verifying your email"
          helper="Hang tight — this should only take a moment."
        >
          <div className="flex flex-col items-center gap-3 py-6 text-fg-muted">
            <Spinner size="lg" />
            <span className="text-small-admin">Working on it…</span>
          </div>
        </AuthFormShell>
      );
    }

    if (verify.isError) {
      return (
        <AuthFormShell title="Verification failed" helper="This link is invalid or has expired.">
          <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{verify.error.message}</span>
          </div>
          <Link href="/login" className="mt-6 block">
            <Button variant="primary" size="lg" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </AuthFormShell>
      );
    }

    return (
      <AuthFormShell title="Email verified" helper="Your account is ready to go.">
        <div className="flex flex-col items-center gap-3 rounded-md border border-positive/30 bg-positive/10 px-4 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-positive" />
          <span className="text-small-admin text-fg">You're all set.</span>
        </div>
        <Link href="/" className="mt-6 block">
          <Button variant="primary" size="lg" className="w-full">
            Continue to dashboard
          </Button>
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Verify your email"
      helper={
        email
          ? `We sent a verification link to ${decodeURIComponent(email)}.`
          : 'We sent a verification link to your email.'
      }
      footer={
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-6 text-center">
        <MailCheck className="h-8 w-8 text-accent" />
        <p className="text-small-admin text-fg">
          Click the link in the email to activate your account.
        </p>
      </div>
      {/* Resend not yet implemented server-side — endpoint missing in auth.controller.ts */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="mt-4 w-full"
        disabled
        title="Resend coming soon"
      >
        Resend email
      </Button>
    </AuthFormShell>
  );
}
