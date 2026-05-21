'use client';

import { AuthFormShell } from '@/features/auth/components';
import { useForgotPassword } from '@/features/auth/hooks';
import { Link } from '@/i18n/navigation';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ForgotPasswordDto, ForgotPasswordSchema } from '@repo/types';
import { Button, FormField, Input, Spinner } from '@repo/ui';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';

export default function ForgotPasswordPage() {
  const t = useTranslations('admin.auth.forgotPassword');
  const tValidation = useTranslations('validation');
  const forgot = useForgotPassword();
  const form = useForm<ForgotPasswordDto>({
    resolver: zodResolver(ForgotPasswordSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit((values) => forgot.mutate(values));

  if (forgot.isSuccess) {
    return (
      <AuthFormShell title={t('success.title')} helper={t('success.helper')}>
        <div className="flex flex-col items-center gap-4 rounded-md border border-accent/30 bg-accent/10 px-4 py-6 text-center">
          <MailCheck className="h-8 w-8 text-accent" />
          <p className="text-small-admin text-fg">{t('success.description')}</p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-small-admin text-accent underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title={t('title')}
      helper={t('helper')}
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={forgot.isPending} className="space-y-4">
          <FormField label={t('email')} required error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder={t('emailPlaceholder')}
              {...form.register('email')}
            />
          </FormField>

          {forgot.isError && (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{forgot.error.message}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={forgot.isPending}
          >
            {forgot.isPending && <Spinner size="sm" tone="current" />}
            {t('submit')}
          </Button>
        </fieldset>
      </form>
    </AuthFormShell>
  );
}
