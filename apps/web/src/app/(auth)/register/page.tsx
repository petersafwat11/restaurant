'use client';

import { useRegister } from '@/features/auth/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterDto, RegisterSchema } from '@repo/types';
import { FormField } from '@repo/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const form = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await register.mutateAsync(values).catch(() => null);
    if (res) router.push('/account');
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-eyebrow uppercase text-accent">Get started</span>
        <h1 className="font-display text-h2 text-fg">Create your account</h1>
        <p className="text-small text-fg-muted">
          Faster checkout, saved addresses, loyalty points.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="reg-first"
            label="First name"
            size="lg"
            error={form.formState.errors.firstName?.message}
          >
            <input
              {...form.register('firstName')}
              autoComplete="given-name"
              placeholder="Jan"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <FormField
            id="reg-last"
            label="Last name"
            size="lg"
            error={form.formState.errors.lastName?.message}
          >
            <input
              {...form.register('lastName')}
              autoComplete="family-name"
              placeholder="Kowalski"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
        </div>
        <FormField
          id="reg-email"
          label="Email"
          required
          size="lg"
          error={form.formState.errors.email?.message}
        >
          <input
            {...form.register('email')}
            type="email"
            autoComplete="email"
            placeholder="jan@example.com"
            className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>
        <FormField
          id="reg-password"
          label="Password"
          required
          size="lg"
          helper="At least 10 characters, with a number."
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
          disabled={register.isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-small text-fg-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
