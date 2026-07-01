'use client';

import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface AuthNavProps {
  /**
   * 'bar' — compact inline cluster for the desktop top nav.
   * 'drawer' — full-width stacked buttons for the mobile nav drawer.
   */
  variant: 'bar' | 'drawer';
  /** Called on navigation — used by the drawer to close itself on tap. */
  onNavigate?: () => void;
}

/**
 * Auth entry point in the site chrome. Guests see Log in + Sign up; signed-in
 * customers see a single "Account" link. Reads the auth store directly (client
 * only) — first render matches the SSR guest state, then swaps once the session
 * hydrates, so there's no hydration mismatch.
 */
export function AuthNav({ variant, onNavigate }: AuthNavProps) {
  const t = useTranslations('web.layout.auth');
  const user = useAuthStore((s) => s.user);

  if (variant === 'drawer') {
    if (user) {
      return (
        <Link
          href="/account"
          onClick={onNavigate}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-4 text-small font-medium text-fg transition-colors hover:bg-surface-warm/40"
        >
          <User size={16} strokeWidth={1.75} />
          {t('account')}
        </Link>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/login"
          onClick={onNavigate}
          className="inline-flex h-11 items-center justify-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-4 text-small font-medium text-fg transition-colors hover:bg-surface-warm/40"
        >
          {t('login')}
        </Link>
        <Link
          href="/register"
          onClick={onNavigate}
          className="inline-flex h-11 items-center justify-center rounded-button bg-accent px-4 text-small font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
        >
          {t('signup')}
        </Link>
      </div>
    );
  }

  // variant === 'bar' (desktop)
  if (user) {
    const name = user.firstName?.trim() || t('account');
    return (
      <Link
        href="/account"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small font-medium text-fg transition-colors hover:border-accent/40 hover:text-accent"
      >
        <User size={16} strokeWidth={1.75} />
        <span className="max-w-[12ch] truncate">{name}</span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-button px-3 text-small font-medium text-fg transition-colors hover:text-accent"
      >
        {t('login')}
      </Link>
      <Link
        href="/register"
        className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-4 text-small font-medium text-fg transition-colors hover:border-accent/40 hover:text-accent"
      >
        {t('signup')}
      </Link>
    </div>
  );
}
