import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

// Public-but-private pages (signed-token order tracking deep links). Not for SERPs.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Public route group — pages that need full site chrome but aren't part of
 * marketing/shop/account/auth. Currently hosts the public order-tracking
 * deep-link `/orders/[orderId]` (signed token in the URL, no auth required).
 *
 * No cart provider here — tracking is a read-only page. If a user wants to
 * order more, the nav links them to /menu (which mounts the cart container
 * via the (shop) layout).
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <>
      <a href="#main" className="skip-link">
        {tCommon('skipToContent')}
      </a>
      <SiteChrome initialVariant="solid" />
      <main id="main">{children}</main>
      <SzefSiteFooter />
    </>
  );
}
