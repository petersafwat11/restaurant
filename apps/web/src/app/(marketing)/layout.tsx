import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import type { ReactNode } from 'react';

/**
 * Marketing route group — landing, about, locations, contact, reservations.
 *
 * The site chrome (SiteChrome) uses the 'transparent-on-hero' variant on the
 * root marketing page so the hero shines through; pages that don't open with
 * a hero override by setting their own header treatment.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteChrome initialVariant="transparent-on-hero" />
      <main id="main">{children}</main>
      <SzefSiteFooter />
    </>
  );
}
