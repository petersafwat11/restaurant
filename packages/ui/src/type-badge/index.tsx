'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface TypeBadgeProps {
  label: string;
  /** Neutral by default; 'accent' for primary-coded values (e.g. DELIVERY). */
  tone?: 'neutral' | 'accent';
  className?: string;
}

/**
 * Compact uppercase badge used to annotate row metadata (OrderType, payment
 * method, channel). Neutral, no fill — keeps the table dense and lets
 * StatusPill remain the only attention-grabbing color in the row.
 */
export function TypeBadge({ label, tone = 'neutral', className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium uppercase tracking-wider',
        tone === 'accent'
          ? 'border-accent/30 bg-accent/[0.08] text-accent'
          : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-subtle',
        className,
      )}
    >
      {label}
    </span>
  );
}
