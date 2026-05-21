'use client';

import { AuthFormShell, PasswordInput, PasswordStrengthMeter } from '@/features/auth/components';
import { useResetPassword } from '@/features/auth/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema, type ResetPasswordDto } from '@repo/types';
import { Button, FormField, Spinner } from '@repo/ui';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

function buildFormSchema(mismatchMessage: string) {
  return z
    .object({
      password: PasswordSchema,
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          path: ['confirmPassword'],
          code: z.ZodIssueCode.custom,
          message: mismatchMessage,
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

export default function ResetPasswordPage() {
  const t = useTranslations('admin.auth.resetPassword');
  const tValidation = useTranslations('validation');
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const reset = useResetPassword();

  const formSchema = React.useMemo(
    () => buildFormSchema(tValidation('passwordsDoNotMatch')),
    [tValidation],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = form.watch('password');

  const onSubmit = form.handleSubmit((values) => {
    if (!token) return;
    const payload: ResetPasswordDto = { token, password: values.password };
    reset.mutate(payload, {
      onSuccess: () => router.replace('/login'),
    });
  });

  if (!token) {
    return (
      <AuthFormShell title={t('expired.title')} helper={t('expired.helper')}>
        <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('expired.description')}</span>
        </div>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="primary" size="lg" className="w-full">
            {t('expired.requestNew')}
          </Button>
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title={t('title')}
      helper={t('helper')}
      footer={
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={reset.isPending} className="space-y-4">
          <FormField label={t('password')} required error={form.formState.errors.password?.message}>
            <PasswordInput autoComplete="new-password" autoFocus {...form.register('password')} />
          </FormField>
          {password && <PasswordStrengthMeter value={password} />}

          <FormField
            label={t('confirmPassword')}
            required
            error={form.formState.errors.confirmPassword?.message}
          >
            <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
          </FormField>

          {reset.isError && (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{reset.error.message}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={reset.isPending}
          >
            {reset.isPending && <Spinner size="sm" tone="current" />}
            {t('submit')}
          </Button>
        </fieldset>
      </form>
    </AuthFormShell>
  );
}
