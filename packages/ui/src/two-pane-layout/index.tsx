'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface TwoPaneLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Width of the left pane in px. */
  leftWidth?: number;
  /** Stack vertically when viewport drops below this px. */
  collapseBelow?: number;
  divider?: boolean;
  className?: string;
}

/**
 * Side-by-side layout used on Menu + Settings + Reports. Above
 * `collapseBelow` viewport width, lays out `[leftWidth] · divider · 1fr`.
 * Below, stacks vertically. Both panes scroll independently when their
 * content overflows.
 */
export function TwoPaneLayout({
  left,
  right,
  leftWidth = 300,
  collapseBelow = 1100,
  divider = true,
  className,
}: TwoPaneLayoutProps) {
  const [stacked, setStacked] = React.useState(false);

  React.useEffect(() => {
    function onResize() {
      setStacked(window.innerWidth < collapseBelow);
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [collapseBelow]);

  if (stacked) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className="min-h-0">{left}</div>
        {divider && <div className="h-px bg-border/[var(--border-strong-alpha)]" />}
        <div className="min-h-0">{right}</div>
      </div>
    );
  }

  return (
    <div
      className={cn('grid min-h-0 gap-0', className)}
      style={{
        gridTemplateColumns: divider
          ? `${leftWidth}px 1px 1fr`
          : `${leftWidth}px 1fr`,
      }}
    >
      <div className="min-w-0 overflow-y-auto pr-4">{left}</div>
      {divider && <div className="bg-border/[var(--border-strong-alpha)]" />}
      <div className="min-w-0 overflow-y-auto pl-4">{right}</div>
    </div>
  );
}
