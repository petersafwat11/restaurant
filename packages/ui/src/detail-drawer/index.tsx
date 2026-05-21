'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetTitle } from '../_shadcn/sheet';
import { cn } from '../lib/cn';

export interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header slot — typically a `<DrawerHeader>` rendered by the page. */
  header?: React.ReactNode;
  /** Footer slot — sticky at the bottom of the drawer. */
  footer?: React.ReactNode;
  /** Custom width in px; defaults to 480. */
  width?: number;
  side?: 'right' | 'left';
  /**
   * Accessible name announced to screen readers. Rendered as a visually-hidden
   * `SheetTitle` to satisfy Radix Dialog's required-title rule — the visible
   * title typically lives inside the `header` slot.
   */
  ariaLabel?: string;
  children?: React.ReactNode;
  /** When true, the drawer body has no internal padding (used by SectionedDrawerBody). */
  flushBody?: boolean;
}

/**
 * Right-side overlay drawer for Order/Customer/Review/Promotion detail views.
 * Built on shadcn `Sheet`, so focus-trap, scroll-lock, Esc-to-close, and
 * focus-return-on-close come from Radix.
 *
 * Layout:
 *   - sticky `header` (border-b)
 *   - scrollable `children` body
 *   - sticky `footer` (border-t)
 */
export function DetailDrawer({
  open,
  onOpenChange,
  header,
  footer,
  width = 480,
  side = 'right',
  ariaLabel,
  flushBody,
  children,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        width={width}
        className="flex flex-col gap-0 p-0"
      >
        <SheetTitle className="sr-only">{ariaLabel ?? 'Detail'}</SheetTitle>
        {header && (
          <div className="sticky top-0 z-10 shrink-0 border-b-hairline bg-surface-2">
            {header}
          </div>
        )}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            flushBody ? 'p-0' : 'px-6 py-4',
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 shrink-0 border-t-hairline bg-surface-2 px-6 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
