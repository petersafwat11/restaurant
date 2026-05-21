'use client';

import { AuthFormShell, PasswordInput, PasswordStrengthMeter } from '@/features/auth/components';
import { useRegister } from '@/features/auth/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterDto, RegisterSchema } from '@repo/types';
import { Button, FormField, Input, Spinner } from '@repo/ui';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';

export default function RegisterPage() {
  const t = useTranslations('admin.auth.register');
  const tValidation = useTranslations('validation');
  const router = useRouter();
  const register = useRegister();
  const [showReferral, setShowReferral] = React.useState(false);

  const form = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      referralCode: '',
    },
  });

  const password = form.watch('password');

  const onSubmit = form.handleSubmit((values) => {
    const payload: RegisterDto = {
      email: values.email,
      password: values.password,
      firstName: values.firstName?.trim() || undefined,
      lastName: values.lastName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      referralCode:
        showReferral && values.referralCode?.trim() ? values.referralCode.trim() : undefined,
    };
    register.mutate(payload, {
      onSuccess: () => {
        const email = encodeURIComponent(values.email);
        router.replace(`/verify-email?email=${email}`);
      },
    });
  });

  return (
    <AuthFormShell
      title={t('title')}
      helper={t('helper')}
      footer={
        <>
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-accent underline-offset-4 hover:underline">
            {t('login')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={register.isPending} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('firstName')} error={form.formState.errors.firstName?.message}>
              <Input autoComplete="given-name" {...form.register('firstName')} />
            </FormField>
            <FormField label={t('lastName')} error={form.formState.errors.lastName?.message}>
              <Input autoComplete="family-name" {...form.register('lastName')} />
            </FormField>
          </div>

          <FormField label={t('email')} required error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              {...form.register('email')}
            />
          </FormField>

          <FormField
            label={t('phone')}
            hint={t('optional')}
            error={form.formState.errors.phone?.message}
          >
            <Input
              type="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              {...form.register('phone')}
            />
          </FormField>

          <FormField
            label={t('password')}
            required
            error={form.formState.errors.password?.message}
            helper={!form.formState.errors.password && !password ? t('passwordHelper') : undefined}
          >
            <PasswordInput autoComplete="new-password" {...form.register('password')} />
          </FormField>
          {password && <PasswordStrengthMeter value={password} />}

          <div>
            {!showReferral ? (
              <button
                type="button"
                onClick={() => setShowReferral(true)}
                className="text-small-admin text-accent underline-offset-4 hover:underline"
              >
                {t('haveReferralCode')}
              </button>
            ) : (
              <FormField
                label={t('referralCode')}
                error={form.formState.errors.referralCode?.message}
              >
                <Input
                  placeholder={t('referralPlaceholder')}
                  autoCapitalize="characters"
                  {...form.register('referralCode')}
                />
              </FormField>
            )}
          </div>

          {register.isError && (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{register.error.message}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={register.isPending}
          >
            {register.isPending && <Spinner size="sm" tone="current" />}
            {t('submit')}
          </Button>
        </fieldset>
      </form>
    </AuthFormShell>
  );
}
