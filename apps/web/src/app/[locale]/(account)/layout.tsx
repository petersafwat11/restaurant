import { AccountNav } from '@/components/account-nav';
import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import { Container } from '@repo/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

/**
 * Account route group. Middleware (apps/web/src/middleware.ts) guards
 * with auth-cookie redirect to /login.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <>
      <a href="#main" className="skip-link">
        {t('skipToContent')}
      </a>
      <SiteChrome initialVariant="solid" />
      <main id="main" className="bg-bg py-12">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <AccountNav />
            <div className="flex-1">{children}</div>
          </div>
        </Container>
      </main>
      <SzefSiteFooter />
    </>
  );
}
