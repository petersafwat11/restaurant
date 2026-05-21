'use client';

import { AuthFormShell, PasswordInput, PasswordStrengthMeter } from '@/features/auth/components';
import { useResetPassword } from '@/features/auth/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema, type ResetPasswordDto } from '@repo/types';
import { Button, FormField, Spinner } from '@repo/ui';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const FormSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
      });
    }
  });
type FormValues = z.infer<typeof FormSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const reset = useResetPassword();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
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
      <AuthFormShell title="Link expired" helper="This reset link is invalid or has expired.">
        <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Please request a new password reset link.</span>
        </div>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="primary" size="lg" className="w-full">
            Request a new link
          </Button>
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Choose a new password"
      helper="Pick something strong — you'll use this every day."
      footer={
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={reset.isPending} className="space-y-4">
          <FormField label="New password" required error={form.formState.errors.password?.message}>
            <PasswordInput autoComplete="new-password" autoFocus {...form.register('password')} />
          </FormField>
          {password && <PasswordStrengthMeter value={password} />}

          <FormField
            label="Confirm password"
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
            Update password
          </Button>
        </fieldset>
      </form>
    </AuthFormShell>
  );
}
