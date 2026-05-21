import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function MarketingLayout({
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
      <SiteChrome initialVariant="transparent-on-hero" />
      <main id="main">{children}</main>
      <SzefSiteFooter />
    </>
  );
}
