'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface TwoPaneLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Width of the left pane in px (applied at `lg`+). */
  leftWidth?: number;
  divider?: boolean;
  className?: string;
}

/**
 * Side-by-side layout used on Menu + Settings. At `lg`+ it lays out
 * `[leftWidth] · divider · 1fr`; below `lg` it stacks vertically. Both panes
 * scroll independently at `lg`+.
 *
 * CSS-driven (no `window.innerWidth` listener) so there's no desktop-first
 * SSR / hydration flash. The fixed left width is passed through a CSS variable
 * so the breakpoint prefix can stay static for Tailwind.
 */
export function TwoPaneLayout({
  left,
  right,
  leftWidth = 300,
  divider = true,
  className,
}: TwoPaneLayoutProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col gap-4 lg:grid lg:gap-0',
        divider
          ? 'lg:grid-cols-[var(--tp-left)_1px_minmax(0,1fr)]'
          : 'lg:grid-cols-[var(--tp-left)_minmax(0,1fr)]',
        className,
      )}
      style={{ ['--tp-left' as string]: `${leftWidth}px` }}
    >
      <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:pr-4">{left}</div>
      {divider && (
        <div className="h-px w-full bg-border/[var(--border-strong-alpha)] lg:h-auto lg:w-px" />
      )}
      <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:pl-4">{right}</div>
    </div>
  );
}
