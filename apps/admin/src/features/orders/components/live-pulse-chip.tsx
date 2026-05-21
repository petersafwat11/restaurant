'use client';

import { cn } from '@repo/ui';
import * as React from 'react';

interface LivePulseChipProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Topbar chip that surfaces the count of orders that arrived via realtime
 * in the last 5 minutes. Clicking jumps the user to the top of the list and
 * resets the counter. When count is 0, shows a muted "All caught up" state.
 */
export function LivePulseChip({ count, onClick, className }: LivePulseChipProps) {
  if (count > 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex h-8 items-center gap-2 rounded-full border-hairline-strong bg-accent/[0.12] px-3 text-xs font-medium text-fg transition-colors hover:bg-accent/[0.18]',
          className,
        )}
      >
        <span aria-hidden className="relative grid h-2 w-2 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/60 motion-reduce:animate-none" />
          <span className="relative h-2 w-2 rounded-full bg-accent" />
        </span>
        <span>
          <span className="tabular-nums">{count}</span> new in last 5 min
        </span>
      </button>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border-hairline px-3 text-xs text-fg-subtle',
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-subtle" />
      All caught up
    </span>
  );
}
