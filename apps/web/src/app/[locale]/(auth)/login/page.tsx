'use client';

import { useLogin } from '@/features/auth/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginDto, LoginSchema } from '@repo/types';
import { FormField } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const t = useTranslations('web.auth.login');
  const tValidation = useTranslations('validation');
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/account';
  const login = useLogin();

  const form = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await login.mutateAsync(values).catch(() => null);
    if (result) router.push(redirect);
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-eyebrow uppercase text-accent">{t('eyebrow')}</span>
        <h1
          className="font-display text-h2 text-fg"
          style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
        >
          {t('title')}
        </h1>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField
          id="login-email"
          label={t('fields.email')}
          required
          size="lg"
          error={form.formState.errors.email?.message}
        >
          <input
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder={t('fields.emailPlaceholder')}
            className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>
        <FormField
          id="login-password"
          label={t('fields.password')}
          required
          size="lg"
          error={form.formState.errors.password?.message}
        >
          <input
            {...form.register('password')}
            type="password"
            autoComplete="current-password"
            className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>

        <button
          type="submit"
          disabled={login.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {login.isPending ? t('actions.submitting') : t('actions.submit')}
        </button>

        <div className="flex items-center justify-between text-small">
          <Link href="/forgot-password" className="text-fg-muted hover:text-accent">
            {t('links.forgotPassword')}
          </Link>
          <Link href="/register" className="text-fg-muted hover:text-accent">
            {t('links.createAccount')}
          </Link>
        </div>
      </form>
    </div>
  );
}
