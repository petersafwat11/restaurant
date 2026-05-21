'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type CheckoutSectionStatus = 'pending' | 'active' | 'complete' | 'error';

export interface CheckoutSectionProps {
  step: number;
  title: string;
  status: CheckoutSectionStatus;
  /** Shown inline next to the title when status='complete' — a one-line summary like "Marszałkowska 102 · ASAP". */
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
      <div className="flex items-center gap-3 px-5 py-4">
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
        <div className="flex flex-1 items-baseline gap-3">
          <span id={`co-sec-${step}`} className="text-body font-semibold text-fg">
            {title}
          </span>
          {summary && status === 'complete' && (
            <span className="text-small text-fg-muted">{summary}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
