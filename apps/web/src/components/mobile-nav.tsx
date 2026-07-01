'use client';

import { Link } from '@/i18n/navigation';
import { Sheet, SheetContent, SheetTitle, cn } from '@repo/ui';
import * as React from 'react';

export interface MobileNavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: MobileNavLink[];
  /** Brand logo, shown at the top of the drawer (links home). */
  logo: React.ReactNode;
  /** Auth cluster (Log in / Sign up, or an account link). */
  auth: React.ReactNode;
  /** Language switcher element (rendered in the drawer footer). */
  langSwitcher: React.ReactNode;
  /** Primary CTA element (e.g. "Order now"). */
  cta: React.ReactNode;
  title: string;
  languageLabel: string;
}

/**
 * Slide-in navigation drawer for mobile/tablet viewports (the primary nav,
 * language switcher and CTA are hidden in the top bar below `lg`). Opened by
 * the hamburger button in <SiteNav>. Closes on link tap, backdrop, or Esc
 * (Radix Dialog handles focus trap + Esc).
 */
export function MobileNav({
  open,
  onOpenChange,
  links,
  logo,
  auth,
  langSwitcher,
  cta,
  title,
  languageLabel,
}: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[86vw] max-w-[360px] gap-0 p-0">
        {/* Brand header — logo links home and closes the drawer. The visible
            title is replaced by the logo; the SheetTitle stays for a11y (Radix
            requires an accessible dialog title). The Sheet's own close button
            sits top-right. */}
        <div className="flex items-center border-b border-border/[var(--border-alpha)] px-6 py-4">
          <Link href="/" aria-label="Szef Donald" onClick={() => onOpenChange(false)}>
            {logo}
          </Link>
        </div>
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <nav aria-label="Mobile" className="flex flex-col gap-1 px-3 py-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? 'page' : undefined}
              onClick={() => onOpenChange(false)}
              className={cn(
                'rounded-button px-3 py-3 text-body font-medium transition-colors',
                l.active ? 'bg-accent-muted text-fg' : 'text-fg hover:bg-surface-warm/40',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 border-t border-border/[var(--border-alpha)] px-6 py-5">
          {auth}
          {/* The CTA is a Link; the drawer auto-closes on route change (see
              site-chrome). No onClick wrapper needed. */}
          {cta}
          <div className="flex items-center justify-between gap-3">
            <span className="text-small text-fg-muted">{languageLabel}</span>
            {langSwitcher}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
