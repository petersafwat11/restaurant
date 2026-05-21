'use client';

import { CartButton } from '@/components/cart-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { useCart } from '@/features/cart/hooks';
import type { LocaleCode } from '@repo/types';
import { SiteNav } from '@repo/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

const NAV_LINKS = [
  { href: '/menu', label: 'Menu' },
  { href: '/about', label: 'About' },
  { href: '/locations', label: 'Locations' },
  { href: '/contact', label: 'Contact' },
] as const;

interface SiteChromeProps {
  /** 'transparent-on-hero' = switches to solid past scroll Y=80 (landing).
   *  'solid' = always solid (menu, checkout, account, etc.). */
  initialVariant?: 'transparent-on-hero' | 'solid';
}

/**
 * Wraps `<SiteNav>` with scroll-state tracking + cart count + language state.
 *
 * Used by the (marketing) layout (transparent over hero) and (shop) /
 * (account) layouts (always solid). Auth uses its own minimal header in
 * `(auth)/layout.tsx`.
 */
export function SiteChrome({ initialVariant = 'solid' }: SiteChromeProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [lang, setLang] = React.useState<LocaleCode>('en');
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (initialVariant !== 'transparent-on-hero') return;
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [initialVariant]);

  // Cart count — only fires when sessionKey is hydrated (via cookie or POST mint).
  // The hook is internally gated on sessionKey presence, so it stays idle on
  // marketing pages where no cart-session provider is mounted.
  const cartQuery = useCart();
  const cartCount = cartQuery.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const variant = initialVariant === 'transparent-on-hero' && !scrolled ? 'transparent' : 'solid';

  const links = NAV_LINKS.map((l) => ({
    ...l,
    active: pathname === l.href || pathname?.startsWith(`${l.href}/`),
  }));

  return (
    <SiteNav
      variant={variant}
      logo={<Logo variant="full" size={36} />}
      links={links}
      cart={<CartButton count={cartCount} onClick={() => router.push('/menu')} />}
      langSwitcher={<LanguageSwitcher value={lang} onChange={setLang} />}
      cta={
        <Link
          href="/menu"
          className="inline-flex h-10 items-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
        >
          Order now
        </Link>
      }
    />
  );
}
