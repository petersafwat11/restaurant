import Link from 'next/link';
import * as React from 'react';
import { Container } from '../container';
import { cn } from '../lib/cn';

export interface SiteFooterColumn {
  heading: string;
  /** Pre-rendered link list — lets columns include non-link elements (hours table, address block). */
  body: React.ReactNode;
}

export interface SiteFooterProps {
  /** Brand column: logo + tagline + socials. */
  brandSlot: React.ReactNode;
  /** Additional columns — typically 3 (Menu, Visit, Company). */
  columns: SiteFooterColumn[];
  /** Bottom bar: left text, center legal links, right element (e.g. language switcher). */
  bottom?: {
    copyright: React.ReactNode;
    legal?: { href: string; label: string }[];
    rightSlot?: React.ReactNode;
  };
  className?: string;
}

/**
 * The customer site footer. Inverts the palette — espresso (`--fg`) background
 * with cream (`--surface`) text — for visual contrast at the page end.
 */
export function SiteFooter({ brandSlot, columns, bottom, className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        'bg-fg pb-12 pt-20 text-surface',
        className,
      )}
    >
      <Container>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>{brandSlot}</div>
          {columns.map((c) => (
            <div key={c.heading}>
              <h3 className="mb-4 text-caption uppercase text-surface/60">{c.heading}</h3>
              <div className="flex flex-col gap-2 text-[15px] text-surface/80">{c.body}</div>
            </div>
          ))}
        </div>
        {bottom && (
          <div className="mt-16 flex flex-col gap-4 border-t border-surface/10 pt-6 text-small text-surface/60 sm:flex-row sm:items-center sm:justify-between">
            <div>{bottom.copyright}</div>
            {bottom.legal && (
              <div className="flex items-center gap-4">
                {bottom.legal.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-surface/60 transition-colors hover:text-surface"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
            {bottom.rightSlot}
          </div>
        )}
      </Container>
    </footer>
  );
}
