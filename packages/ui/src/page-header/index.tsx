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
        'sticky top-topbar z-20 -mx-6 mb-4 border-b-hairline bg-bg/80 px-6 backdrop-blur',
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
          // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable per page
          <div key={i} className="flex items-center gap-3">
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
