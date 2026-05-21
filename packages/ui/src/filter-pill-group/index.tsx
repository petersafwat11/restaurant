'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface FilterPillOption<TId extends string> {
  id: TId;
  label: string;
  count?: number;
  /** When set, a colored dot appears before the label. Used for status filters. */
  dot?: boolean;
  /** Tailwind class controlling the dot color (e.g. `bg-status-ready`). */
  dotClassName?: string;
}

export interface FilterPillGroupProps<TId extends string> {
  value: TId;
  onChange: (next: TId) => void;
  options: FilterPillOption<TId>[];
  className?: string;
  ariaLabel?: string;
}

/**
 * Horizontal scrollable filter pills used on every list page. The
 * `dot` + `dotClassName` props let status filters paint a small colored
 * dot before the label without hardcoding any hex — pass a semantic
 * Tailwind class like `bg-status-ready`.
 */
export function FilterPillGroup<TId extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: FilterPillGroupProps<TId>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1 overflow-x-auto', className)}
    >
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
              isActive
                ? 'border-accent/40 bg-accent/[0.10] text-fg'
                : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:text-fg',
            )}
          >
            {opt.dot && (
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  opt.dotClassName ?? 'bg-fg-subtle',
                )}
              />
            )}
            <span>{opt.label}</span>
            {opt.count != null && (
              <span className="tabular-nums text-fg-subtle">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
