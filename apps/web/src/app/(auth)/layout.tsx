import { Logo } from '@/components/logo';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Auth route group — login, register, forgot-password, reset-password,
 * verify-email.
 *
 * Minimal chrome: logo only (no nav links, no cart, no language switcher).
 * Content is centered with a narrow max-width — auth forms breathe.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="flex h-[72px] items-center px-6 sm:px-10">
        <Link href="/" aria-label="Szef Donald home">
          <Logo variant="full" size={36} />
        </Link>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-[480px] flex-col px-6 pb-24 pt-8 sm:px-0"
      >
        {children}
      </main>
    </>
  );
}
