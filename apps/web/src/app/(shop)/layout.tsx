import { CartContainer } from '@/components/cart-container';
import { CartSessionProvider } from '@/components/cart-session-provider';
import { SiteChrome } from '@/components/site-chrome';
import { SzefSiteFooter } from '@/components/site-footer-szef';
import { getCartSessionKey } from '@/lib/cart-session';
import type { ReactNode } from 'react';

/**
 * Shop route group — menu, cart, checkout, checkout/success.
 *
 * Wraps with CartSessionProvider (cookie-backed session key for guest carts),
 * SiteChrome (always solid here — no transparent-over-hero), and the global
 * CartContainer (CartSheet + FloatingCartButton). Both providers + the
 * container only re-render on route changes; the cart hooks fetch on demand.
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const initialSessionKey = await getCartSessionKey();

  return (
    <CartSessionProvider initial={initialSessionKey}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteChrome initialVariant="solid" />
      <main id="main">{children}</main>
      <CartContainer />
      <SzefSiteFooter />
    </CartSessionProvider>
  );
}
