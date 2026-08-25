'use client';

import { PasswordInput } from '@/features/auth/components';
import { useAdminSetUserPassword } from '@/features/staff/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminSetUserPasswordSchema } from '@repo/types';
import { ActionModal, Label } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';

interface Props {
  /** Target user (id + display name) or null when closed. */
  target: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

type FormValues = { newPassword: string };

/**
 * Owner-only modal that force-sets another user's password (staff or
 * customer). The target's active sessions are revoked server-side.
 */
export function SetPasswordModal({ target, onOpenChange }: Props) {
  const t = useTranslations('admin.staff.setPasswordModal');
  const setPassword = useAdminSetUserPassword();
  const open = target !== null;

  const form = useForm<FormValues>({
    resolver: zodResolver(AdminSetUserPasswordSchema),
    defaultValues: { newPassword: '' },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ newPassword: '' });
    }
  }, [form, open]);

  const submit = form.handleSubmit((values) => {
    if (!target) return;
    setPassword.mutate(
      { userId: target.id, newPassword: values.newPassword },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={target ? t('description', { name: target.name }) : undefined}
      width={520}
      primary={{
        label: setPassword.isPending ? t('saving') : t('save'),
        onClick: () => void submit(),
        loading: setPassword.isPending,
      }}
      secondary={{
        label: t('cancel'),
        onClick: () => onOpenChange(false),
        disabled: setPassword.isPending,
      }}
      footerHelper={t('helper')}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="set-password-new">{t('newPassword')}</Label>
          <PasswordInput
            id="set-password-new"
            autoFocus
            autoComplete="new-password"
            {...form.register('newPassword')}
          />
          {form.formState.errors.newPassword?.message ? (
            <p className="text-xs text-negative">{form.formState.errors.newPassword.message}</p>
          ) : (
            <p className="text-xs text-fg-subtle">{t('passwordHint')}</p>
          )}
        </div>
      </form>
    </ActionModal>
  );
}
