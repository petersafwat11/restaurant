'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface PageHeaderProps {
  title?: string;
  /** Each row renders inside its own flex line — typical pattern: filters · search · actions. */
  rows?: React.ReactNode[];
  /** Bulk-action bar slot — rendered above the rows when present. */
  bulk?: React.ReactNode;
  className?: string;
}

/**
 * Sticky page header used at the top of every list page. Stacks rows
 * vertically with consistent spacing; the optional `bulk` slot is reserved
 * for `BulkActionBar` which animates in when selection becomes non-empty.
 *
 * Sticky positioning: `top-topbar` keeps it just below the 56px Topbar so the
 * filter row stays visible while the table scrolls.
 */
export function PageHeader({ title, rows = [], bulk, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Full-bleed to the page gutter — mirrors the layout's `px-4 sm:px-6`
        // main padding so the header lines up at every breakpoint.
        'sticky top-topbar z-20 -mx-4 mb-4 border-b-hairline bg-bg/80 px-4 backdrop-blur sm:-mx-6 sm:px-6',
        className,
      )}
    >
      {title && (
        <div className="pt-4">
          <h1 className="text-h1-admin text-fg">{title}</h1>
        </div>
      )}
      {bulk}
      <div className="flex flex-col gap-3 py-3">
        {rows.map((row, i) => (
          // Rows wrap so dense filter/search/action toolbars reflow instead of
          // overflowing horizontally on narrow screens.
          // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable per page
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
