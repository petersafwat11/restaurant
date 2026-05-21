'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface RadioCardOption<TId extends string> {
  id: TId;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: 'positive' | 'warning' | 'negative';
  disabled?: boolean;
  /** Tooltip text when disabled. */
  disabledReason?: string;
}

export interface RadioCardGroupProps<TId extends string> {
  options: RadioCardOption<TId>[];
  value: TId | null;
  onChange: (next: TId) => void;
  layout?: 'horizontal' | 'vertical' | 'grid';
  columns?: 1 | 2 | 3;
  /** When true, switches to a compact row layout (icon left, label center, badge + radio right). */
  rowVariant?: boolean;
  ariaLabel: string;
  className?: string;
}

const BADGE_CLASSES = {
  positive: 'bg-positive/10 text-positive',
  warning: 'bg-warning/10 text-warning',
  negative: 'bg-negative/10 text-negative',
  default: 'bg-surface-warm/60 text-fg-muted',
} as const;

export function RadioCardGroup<TId extends string>({
  options,
  value,
  onChange,
  layout = 'horizontal',
  columns = 2,
  rowVariant = false,
  ariaLabel,
  className,
}: RadioCardGroupProps<TId>) {
  const layoutClass =
    layout === 'grid'
      ? cn('grid gap-3', columns === 1 && 'grid-cols-1', columns === 2 && 'grid-cols-2', columns === 3 && 'grid-cols-3')
      : layout === 'horizontal'
        ? 'flex flex-col gap-3 sm:grid sm:grid-cols-3'
        : 'flex flex-col gap-3';

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(layoutClass, className)}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            title={o.disabled ? o.disabledReason : undefined}
            onClick={() => !o.disabled && onChange(o.id)}
            className={cn(
              'group relative flex w-full items-start gap-3 rounded-card border p-5 text-left transition-colors duration-web-color',
              rowVariant && 'items-center',
              o.disabled
                ? 'cursor-not-allowed border-border/[var(--border-alpha)] bg-surface text-fg-disabled'
                : active
                  ? 'border-accent bg-accent/[0.06] text-fg shadow-sm'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg hover:border-accent/40',
            )}
          >
            {o.icon && (
              <span
                className={cn(
                  'shrink-0',
                  active ? 'text-accent' : 'text-fg-muted',
                )}
              >
                {o.icon}
              </span>
            )}
            <div className={cn('flex-1', rowVariant ? 'flex flex-col gap-0' : 'flex flex-col gap-1')}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-body font-semibold">{o.label}</span>
                {!rowVariant && o.badge && (
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
                      BADGE_CLASSES[o.badgeTone ?? 'default'],
                    )}
                  >
                    {o.badge}
                  </span>
                )}
              </div>
              {o.description && (
                <span className="text-small text-fg-muted">{o.description}</span>
              )}
            </div>
            {rowVariant && o.badge && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
                  BADGE_CLASSES[o.badgeTone ?? 'default'],
                )}
              >
                {o.badge}
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center self-start rounded-full border',
                active
                  ? 'border-accent bg-accent'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface',
              )}
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-text-on-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
