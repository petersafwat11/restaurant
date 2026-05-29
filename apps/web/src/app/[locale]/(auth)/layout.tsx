import { Logo } from '@/components/logo';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

// Auth pages — discoverable from links but should not appear in SERPs.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * Auth route group — login, register, forgot-password, reset-password,
 * verify-email.
 *
 * Minimal chrome: logo only (no nav links, no cart, no language switcher).
 * Content is centered with a narrow max-width — auth forms breathe.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tLayout = await getTranslations({ locale, namespace: 'web.auth.layout' });

  return (
    <>
      <a href="#main" className="skip-link">
        {tCommon('skipToContent')}
      </a>
      <header className="flex h-[72px] items-center px-6 sm:px-10">
        <Link href="/" aria-label={tLayout('brandHome')}>
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
