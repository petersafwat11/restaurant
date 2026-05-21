import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import type { ReactNode } from 'react';

/**
 * Public route group — pages that need full site chrome but aren't part of
 * marketing/shop/account/auth. Currently hosts the public order-tracking
 * deep-link `/orders/[orderId]` (signed token in the URL, no auth required).
 *
 * No cart provider here — tracking is a read-only page. If a user wants to
 * order more, the nav links them to /menu (which mounts the cart container
 * via the (shop) layout).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteChrome initialVariant="solid" />
      <main id="main">{children}</main>
      <SzefSiteFooter />
    </>
  );
}
