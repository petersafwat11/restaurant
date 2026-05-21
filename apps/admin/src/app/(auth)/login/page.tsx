'use client';

import { AuthFormShell, PasswordInput } from '@/features/auth/components';
import { useLogin } from '@/features/auth/hooks';
import { safeNext } from '@/lib/safe-next';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginDto, LoginSchema } from '@repo/types';
import { Button, Checkbox, FormField, Input, Spinner } from '@repo/ui';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

const ALLOW_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_ADMIN_SIGNUP === 'true';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();

  const form = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.replace(safeNext(params.get('next'))),
    });
  });

  return (
    <AuthFormShell
      title="Sign in"
      helper="Use your staff credentials to access the admin console."
      footer={
        ALLOW_SIGNUP ? (
          <>
            Need an account?{' '}
            <Link href="/register" className="text-accent underline-offset-4 hover:underline">
              Request access
            </Link>
          </>
        ) : null
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={login.isPending} className="space-y-4">
          <FormField label="Email" required error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@restaurant.com"
              {...form.register('email')}
            />
          </FormField>

          <FormField label="Password" required error={form.formState.errors.password?.message}>
            <PasswordInput
              autoComplete="current-password"
              placeholder="••••••••"
              {...form.register('password')}
            />
          </FormField>

          <div className="flex items-center justify-between">
            <label
              htmlFor="login-remember"
              className="flex cursor-pointer items-center gap-2 text-small-admin text-fg-muted"
            >
              <Checkbox id="login-remember" /> Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-small-admin text-accent underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {login.isError && (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-small-admin text-negative">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{login.error.message}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={login.isPending}
          >
            {login.isPending && <Spinner size="sm" tone="current" />}
            Sign in
          </Button>
        </fieldset>
      </form>
    </AuthFormShell>
  );
}
