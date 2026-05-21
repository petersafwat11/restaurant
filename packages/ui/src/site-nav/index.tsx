'use client';

import { Menu as MenuIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Container } from '../container';
import { cn } from '../lib/cn';

export interface SiteNavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface SiteNavProps {
  /** Logo element (typically the brand Logo component). */
  logo: React.ReactNode;
  /** Primary center navigation links. Hidden on mobile (<1024px). */
  links: SiteNavLink[];
  /** Right-cluster named slots — keep ordering/spacing consistent across pages. */
  cart?: React.ReactNode;
  langSwitcher?: React.ReactNode;
  cta?: React.ReactNode;
  /** Escape hatch for one-offs (e.g. order-tracking page chip). */
  rightSlot?: React.ReactNode;
  /** 'transparent' over the hero, 'solid' once scrolled past. */
  variant?: 'transparent' | 'solid';
  /** Default true. */
  sticky?: boolean;
  /** Callback to open the mobile menu drawer. */
  onOpenMobile?: () => void;
}

/**
 * The customer site nav. Theme-agnostic via semantic tokens.
 *
 * Sticky behavior + scroll-state toggling lives in a `useScrollState()` hook
 * inside `apps/web/src/components/site-chrome.tsx` — this primitive is pure
 * presentational and re-renders when its parent flips `variant`.
 */
export function SiteNav({
  logo,
  links,
  cart,
  langSwitcher,
  cta,
  rightSlot,
  variant = 'transparent',
  sticky = true,
  onOpenMobile,
}: SiteNavProps) {
  return (
    <header
      className={cn(
        sticky && 'sticky top-0 z-40',
        'h-site-nav-mobile sm:h-site-nav transition-colors duration-web-color',
        variant === 'solid'
          ? 'bg-surface/[0.92] shadow-sm backdrop-blur-md border-b border-border/[var(--border-alpha)]'
          : 'bg-transparent',
      )}
    >
      <Container className="flex h-full items-center justify-between gap-4">
        <Link href="/" aria-label="Szef Donald home" className="shrink-0">
          {logo}
        </Link>
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-8 lg:flex"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? 'page' : undefined}
              className={cn(
                'relative text-[15px] font-medium tracking-tight transition-colors duration-web-color',
                l.active
                  ? 'text-fg after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-accent'
                  : 'text-fg hover:text-accent',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {langSwitcher && <div className="hidden lg:block">{langSwitcher}</div>}
          {cart}
          {cta && <div className="hidden sm:block">{cta}</div>}
          {rightSlot}
          {onOpenMobile && (
            <button
              type="button"
              onClick={onOpenMobile}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full text-fg transition-colors hover:bg-surface-warm/40 lg:hidden"
            >
              <MenuIcon size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </Container>
    </header>
  );
}
