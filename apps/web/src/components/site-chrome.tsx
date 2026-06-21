'use client';

import { CartButton } from '@/components/cart-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { MobileNav } from '@/components/mobile-nav';
import { useCart } from '@/features/cart/hooks';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { SiteNav } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface SiteChromeProps {
  initialVariant?: 'transparent-on-hero' | 'solid';
}

export function SiteChrome({ initialVariant = 'solid' }: SiteChromeProps) {
  const t = useTranslations('web.layout');
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (initialVariant !== 'transparent-on-hero') return;
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [initialVariant]);

  // Close the mobile drawer whenever the route changes (covers nav links and
  // the "Order now" CTA inside the drawer).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the intended trigger; the effect only resets drawer state.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cartQuery = useCart();
  const cartCount = cartQuery.data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const variant = initialVariant === 'transparent-on-hero' && !scrolled ? 'transparent' : 'solid';

  const navLinks = [
    { href: '/menu', label: t('nav.menu') },
    { href: '/about', label: t('nav.about') },
    { href: '/locations', label: t('nav.locations') },
    { href: '/contact', label: t('nav.contact') },
  ] as const;

  const links = navLinks.map((l) => ({
    ...l,
    active: pathname === l.href || pathname?.startsWith(`${l.href}/`),
  }));

  const orderNowCta = (
    <Link
      href="/menu"
      className="inline-flex h-10 items-center justify-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
    >
      {t('cta.orderNow')}
    </Link>
  );

  return (
    <>
      <SiteNav
        variant={variant}
        logo={<Logo variant="full" size={36} />}
        links={links}
        linkComponent={Link}
        onOpenMobile={() => setMobileOpen(true)}
        cart={
          <CartButton
            count={cartCount}
            onClick={() => router.push('/menu')}
            ariaLabel={t('cart.ariaLabel', { count: cartCount })}
          />
        }
        langSwitcher={<LanguageSwitcher />}
        cta={orderNowCta}
      />
      <MobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        links={links}
        langSwitcher={<LanguageSwitcher />}
        cta={orderNowCta}
        title={t('mobileMenuTitle')}
        languageLabel={t('languageSwitcherLabel')}
      />
    </>
  );
}
