'use client';

import { useMe, useUpdateProfile } from '@/features/auth/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { type UpdateProfileDto, UpdateProfileSchema } from '@repo/types';
import { FormField, Spinner } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';

export default function ProfilePage() {
  const t = useTranslations('web.account.profile');
  const meQuery = useMe();
  const update = useUpdateProfile();

  const form = useForm<UpdateProfileDto>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: { firstName: '', lastName: '', phone: '' },
  });

  React.useEffect(() => {
    if (meQuery.data) {
      form.reset({
        firstName: meQuery.data.firstName ?? '',
        lastName: meQuery.data.lastName ?? '',
        phone: meQuery.data.phone ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.data]);

  const onSubmit = form.handleSubmit((values) => update.mutate(values));

  if (meQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
        <p className="mt-1 text-small text-fg-muted">{meQuery.data?.email}</p>
      </header>

      <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="pf-first"
            label={t('fields.firstName')}
            size="lg"
            error={form.formState.errors.firstName?.message}
          >
            <input
              {...form.register('firstName')}
              autoComplete="given-name"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <FormField
            id="pf-last"
            label={t('fields.lastName')}
            size="lg"
            error={form.formState.errors.lastName?.message}
          >
            <input
              {...form.register('lastName')}
              autoComplete="family-name"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
        </div>
        <FormField
          id="pf-phone"
          label={t('fields.phone')}
          size="lg"
          prefix={t('fields.phonePrefix')}
          error={form.formState.errors.phone?.message}
        >
          <input
            {...form.register('phone')}
            type="tel"
            autoComplete="tel"
            placeholder={t('fields.phonePlaceholder')}
          />
        </FormField>

        <button
          type="submit"
          disabled={update.isPending || !form.formState.isDirty}
          className="inline-flex h-12 items-center justify-center self-start rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {update.isPending ? t('actions.saving') : t('actions.save')}
        </button>
      </form>
    </section>
  );
}
