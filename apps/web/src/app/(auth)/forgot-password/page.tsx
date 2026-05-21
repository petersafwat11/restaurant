'use client';

import { useForgotPassword } from '@/features/auth/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ForgotPasswordDto, ForgotPasswordSchema } from '@repo/types';
import { FormField } from '@repo/ui';
import { Check } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const forgot = useForgotPassword();
  const form = useForm<ForgotPasswordDto>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await forgot.mutateAsync(values).catch(() => null);
    setSent(true);
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/[0.10] text-accent">
          <Check size={24} strokeWidth={2} />
        </span>
        <h1 className="font-display text-h3 text-fg">Check your inbox</h1>
        <p className="text-small text-fg-muted">
          If that email exists, a reset link is on its way. The link expires in 30 minutes.
        </p>
        <Link href="/login" className="mt-4 text-small text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-h2 text-fg">Forgot your password?</h1>
        <p className="text-small text-fg-muted">
          Enter the email on your account — we'll send you a reset link.
        </p>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField
          id="forgot-email"
          label="Email"
          required
          size="lg"
          error={form.formState.errors.email?.message}
        >
          <input
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="jan@example.com"
            className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>
        <button
          type="submit"
          disabled={forgot.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {forgot.isPending ? 'Sending…' : 'Send reset link'}
        </button>
        <Link href="/login" className="text-center text-small text-fg-muted hover:text-accent">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
