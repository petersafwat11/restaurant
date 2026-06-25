'use client';

import { useRegister } from '@/features/auth/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterDto, RegisterSchema } from '@repo/types';
import { FormField } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';

// Referral codes are 6-16 alphanumeric (see RegisterSchema). The backend silently
// ignores unknown/malformed codes, so we sanitize here too: a bad `?ref=` must never
// block signup by failing client validation.
function sanitizeReferralCode(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{6,16}$/.test(code) ? code : undefined;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const t = useTranslations('web.auth.register');
  const tValidation = useTranslations('validation');
  const router = useRouter();
  const register = useRegister();
  const params = useSearchParams();
  const referralCode = sanitizeReferralCode(params.get('ref'));

  const form = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', referralCode },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await register.mutateAsync(values).catch(() => null);
    if (res) router.push('/account');
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-eyebrow uppercase text-accent">{t('eyebrow')}</span>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="text-small text-fg-muted">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="reg-first"
            label={t('fields.firstName')}
            size="lg"
            error={form.formState.errors.firstName?.message}
          >
            <input
              {...form.register('firstName')}
              autoComplete="given-name"
              placeholder={t('fields.firstNamePlaceholder')}
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <FormField
            id="reg-last"
            label={t('fields.lastName')}
            size="lg"
            error={form.formState.errors.lastName?.message}
          >
            <input
              {...form.register('lastName')}
              autoComplete="family-name"
              placeholder={t('fields.lastNamePlaceholder')}
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
        </div>
        <FormField
          id="reg-email"
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
          id="reg-password"
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

        {referralCode ? (
          <p className="rounded-input bg-surface-2 px-4 py-3 text-center text-small text-fg-muted">
            {t('referralApplied', { code: referralCode })}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={register.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {register.isPending ? t('actions.submitting') : t('actions.submit')}
        </button>

        <p className="text-center text-small text-fg-muted">
          {t('links.hasAccount')}{' '}
          <Link href="/login" className="text-accent hover:underline">
            {t('links.signIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}
