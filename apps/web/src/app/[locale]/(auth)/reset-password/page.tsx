'use client';

import { useResetPassword } from '@/features/auth/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ResetPasswordDto, ResetPasswordSchema } from '@repo/types';
import { FormField } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const t = useTranslations('web.auth.resetPassword');
  const tValidation = useTranslations('validation');
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();

  const form = useForm<ResetPasswordDto>({
    resolver: zodResolver(ResetPasswordSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { token, password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await reset.mutateAsync(values).catch(() => null);
    if (res) router.push('/login');
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-h3 text-fg">{t('invalid.title')}</h1>
        <p className="text-small text-fg-muted">{t('invalid.description')}</p>
        <Link
          href="/forgot-password"
          className="inline-flex h-10 items-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent hover:bg-accent-hover"
        >
          {t('invalid.requestNew')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <input type="hidden" {...form.register('token')} value={token} />
        <FormField
          id="reset-password"
          label={t('fields.password')}
          required
          size="lg"
          helper={t('fields.passwordHelper')}
          error={form.formState.errors.password?.message}
        >
          <input
            {...form.register('password')}
            type="password"
            autoComplete="new-password"
            className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>
        <button
          type="submit"
          disabled={reset.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {reset.isPending ? t('actions.submitting') : t('actions.submit')}
        </button>
      </form>
    </div>
  );
}
