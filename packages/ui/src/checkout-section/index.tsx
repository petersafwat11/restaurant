'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type CheckoutSectionStatus = 'pending' | 'active' | 'complete' | 'error';

export interface CheckoutSectionProps {
  step: number;
  title: string;
  status: CheckoutSectionStatus;
  /** Shown inline next to the title when status='complete' — a one-line summary like "Ściegiennego 68a · ASAP". */
  summary?: React.ReactNode;
  /** Edit link top-right when complete. */
  onEdit?: () => void;
  /** Right-aligned slot in the header — e.g. "Already a customer? Sign in →" link. */
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Numbered accordion-style section on the checkout page.
 *
 * `'error'` is its own status (locked in decision §12 ¶12): brick-red border +
 * `!` circle make it visually distinct from a regular active state.
 */
export function CheckoutSection({
  step,
  title,
  status,
  summary,
  onEdit,
  rightSlot,
  children,
  className,
}: CheckoutSectionProps) {
  const collapsed = status === 'complete' || status === 'pending';

  return (
    <section
      aria-labelledby={`co-sec-${step}`}
      className={cn(
        'rounded-card border bg-surface-2 transition-colors',
        status === 'pending' && 'border-border/[var(--border-alpha)] opacity-60',
        status === 'active' && 'border-border/[var(--border-strong-alpha)]',
        status === 'complete' && 'border-border/[var(--border-alpha)]',
        status === 'error' && 'border-negative shadow-sm',
        className,
      )}
    >
      {/* The header wraps on narrow viewports: the number + title stay together
          on the first line, while the summary and the right-hand controls drop
          to their own lines instead of forcing the row (and the whole page)
          wider than the screen. `min-w-0` + `truncate` let long values (e.g. a
          phone number with no spaces) ellipsize rather than overflow. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-small font-semibold',
              status === 'complete' && 'bg-positive text-text-on-accent',
              status === 'active' && 'bg-accent text-text-on-accent',
              status === 'error' && 'bg-negative text-text-on-accent',
              status === 'pending' && 'border border-border/[var(--border-strong-alpha)] text-fg-subtle',
            )}
          >
            {status === 'complete' ? (
              <Check size={14} strokeWidth={3} />
            ) : status === 'error' ? (
              '!'
            ) : (
              step
            )}
          </span>
          <span id={`co-sec-${step}`} className="min-w-0 truncate text-body font-semibold text-fg">
            {title}
          </span>
        </div>
        {summary && status === 'complete' && (
          <span className="min-w-0 max-w-full truncate text-small text-fg-muted">{summary}</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {rightSlot}
          {status === 'complete' && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-small text-accent hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="border-t border-border/[var(--border-alpha)] px-5 py-5">
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      )}
    </section>
  );
}
