'use client';

import { PasswordInput } from '@/features/auth/components';
import { useChangeOwnPassword } from '@/features/settings/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema } from '@repo/types';
import { Button, SettingsSectionCard } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

/** UI-only wrapper around the API's ChangePasswordDto that adds the
 * confirm-password field. Validation rules stay sourced from
 * `@repo/types` (PasswordSchema). */
const FormSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: PasswordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof FormSchema>;

const EMPTY: FormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function AccountPasswordCard() {
  const t = useTranslations('admin.settings.account');
  const change = useChangeOwnPassword();
  const [savedJustNow, setSavedJustNow] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: EMPTY,
  });

  // Clear the stale "changed" hint as soon as the user edits again.
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0;
  React.useEffect(() => {
    if (isDirty) setSavedJustNow(false);
  }, [isDirty]);

  const submit = form.handleSubmit((values) => {
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          form.reset(EMPTY);
          setSavedJustNow(true);
        },
      },
    );
  });

  return (
    <SettingsSectionCard id="account" title={t('title')} description={t('description')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field htmlFor="account-current-password" label={t('currentPassword')}>
          <PasswordInput
            id="account-current-password"
            autoComplete="current-password"
            {...form.register('currentPassword')}
          />
          {form.formState.errors.currentPassword?.message && (
            <p className="text-xs text-negative">{form.formState.errors.currentPassword.message}</p>
          )}
        </Field>
        <Field htmlFor="account-new-password" label={t('newPassword')} helper={t('passwordHint')}>
          <PasswordInput
            id="account-new-password"
            autoComplete="new-password"
            {...form.register('newPassword')}
          />
          {form.formState.errors.newPassword?.message && (
            <p className="text-xs text-negative">{form.formState.errors.newPassword.message}</p>
          )}
        </Field>
        <Field htmlFor="account-confirm-password" label={t('confirmPassword')}>
          <PasswordInput
            id="account-confirm-password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword?.message && (
            <p className="text-xs text-negative">{form.formState.errors.confirmPassword.message}</p>
          )}
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-border/[var(--border-alpha)] pt-4">
          {savedJustNow && !isDirty && (
            <span className="text-small text-positive">{t('saved')}</span>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => form.reset(EMPTY)}
            disabled={!isDirty || change.isPending}
          >
            {t('discard')}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!isDirty || change.isPending}>
            {change.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </SettingsSectionCard>
  );
}

function Field({
  htmlFor,
  label,
  helper,
  children,
}: {
  htmlFor: string;
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-small text-fg-muted">
        {label}
      </label>
      {children}
      {helper && <p className="text-xs text-fg-subtle">{helper}</p>}
    </div>
  );
}
