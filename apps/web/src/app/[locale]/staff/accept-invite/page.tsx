'use client';

import { Link } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ApiError } from '@repo/api-client';
import { type AcceptStaffInviteDto, AcceptStaffInviteSchema } from '@repo/types';
import { EmptyState, FormField } from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitePageInner />
    </Suspense>
  );
}

function AcceptInvitePageInner() {
  const t = useTranslations('web.staff.acceptInvite');
  const tValidation = useTranslations('validation');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = React.useState(false);

  const accept = useMutation<{ userId: string }, ApiError, AcceptStaffInviteDto>({
    mutationFn: (input) => getApiClient().staff.acceptInvite(input),
    onSuccess: () => setDone(true),
    onError: (err) => notify('error', err.message),
  });

  const form = useForm<AcceptStaffInviteDto>({
    resolver: zodResolver(AcceptStaffInviteSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { token, password: '', firstName: '', lastName: '' },
  });

  React.useEffect(() => {
    if (token) form.setValue('token', token);
  }, [token, form]);

  const onSubmit = form.handleSubmit((values) => accept.mutate(values));

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-col px-6 pb-24 pt-12 sm:px-0">
        <EmptyState
          size="lg"
          title={t('missingToken.title')}
          description={t('missingToken.description')}
          action={{ label: t('missingToken.action'), href: '/login' }}
        />
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 px-6 pb-24 pt-12 text-center sm:px-0">
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
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-6 pb-24 pt-12 sm:px-0">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-eyebrow uppercase text-accent">{t('eyebrow')}</span>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="text-small text-fg-muted">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="inv-first"
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
            id="inv-last"
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
          id="inv-password"
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
          disabled={accept.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {accept.isPending ? t('actions.submitting') : t('actions.submit')}
        </button>
      </form>
    </main>
  );
}
