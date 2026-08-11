'use client';

import { PasswordInput } from '@/features/auth/components';
import { useCreateStaffAccount } from '@/features/staff/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CREATABLE_STAFF_ROLE_KEYS,
  type CreateStaffAccountDto,
  CreateStaffAccountSchema,
} from '@repo/types';
import { ActionModal, Input, Label } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: CreateStaffAccountDto = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  roleKey: 'cashier',
};

export function CreateStaffAccountModal({ open, onOpenChange }: Props) {
  const t = useTranslations('admin.staff.createModal');
  const tRoles = useTranslations('admin.staff.roles');
  const createAccount = useCreateStaffAccount();
  const { reset: resetMutation } = createAccount;
  const form = useForm<CreateStaffAccountDto>({
    resolver: zodResolver(CreateStaffAccountSchema),
    defaultValues: DEFAULT_VALUES,
  });

  React.useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_VALUES);
      resetMutation();
    }
  }, [form, open, resetMutation]);

  const submit = form.handleSubmit((values) => {
    createAccount.mutate(values, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      width={620}
      primary={{
        label: createAccount.isPending ? t('creating') : t('create'),
        onClick: () => void submit(),
        loading: createAccount.isPending,
      }}
      secondary={{
        label: t('cancel'),
        onClick: () => onOpenChange(false),
        disabled: createAccount.isPending,
      }}
      footerHelper={t('emailNotice')}
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field
          htmlFor="staff-first-name"
          label={t('firstName')}
          error={form.formState.errors.firstName?.message}
        >
          <Input
            id="staff-first-name"
            autoFocus
            autoComplete="given-name"
            {...form.register('firstName')}
          />
        </Field>
        <Field
          htmlFor="staff-last-name"
          label={t('lastName')}
          error={form.formState.errors.lastName?.message}
        >
          <Input id="staff-last-name" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
        <Field
          htmlFor="staff-email"
          label={t('email')}
          error={form.formState.errors.email?.message}
        >
          <Input id="staff-email" type="email" autoComplete="off" {...form.register('email')} />
        </Field>
        <Field
          htmlFor="staff-phone"
          label={t('phone')}
          error={form.formState.errors.phone?.message}
        >
          <Input
            id="staff-phone"
            type="tel"
            autoComplete="off"
            placeholder="+48 123 456 789"
            {...form.register('phone')}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            htmlFor="staff-password"
            label={t('password')}
            error={form.formState.errors.password?.message}
            helper={t('passwordHelper')}
          >
            <PasswordInput
              id="staff-password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            htmlFor="staff-role"
            label={t('role')}
            error={form.formState.errors.roleKey?.message}
          >
            <select
              id="staff-role"
              {...form.register('roleKey')}
              className="h-9 w-full rounded-md border-hairline-strong bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {CREATABLE_STAFF_ROLE_KEYS.map((role) => (
                <option key={role} value={role}>
                  {tRoles(role)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </form>
    </ActionModal>
  );
}

function Field({
  htmlFor,
  label,
  error,
  helper,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : helper ? (
        <p className="text-xs text-fg-subtle">{helper}</p>
      ) : null}
    </div>
  );
}
