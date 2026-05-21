'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface FilterPillMultiOption<TId extends string> {
  id: TId;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface FilterPillMultiGroupProps<TId extends string> {
  options: FilterPillMultiOption<TId>[];
  value: TId[];
  onChange: (next: TId[]) => void;
  /** When set, this id acts as the "All" sentinel — toggling it sets `[allOptionId]`, and unselecting all specific filters re-asserts it. */
  allOptionId?: TId;
  ariaLabel?: string;
  className?: string;
}

/**
 * Multi-select pill group with an optional "All" sentinel — customer-facing
 * variant (sibling to admin's single-select `FilterPillGroup`).
 *
 * Used for dietary filters on the menu page (All / Vegetarian / Vegan /
 * Gluten-free / Spicy). Round-pill copper border on active, leading-icon
 * slot per option.
 */
export function FilterPillMultiGroup<TId extends string>({
  options,
  value,
  onChange,
  allOptionId,
  ariaLabel = 'Filters',
  className,
}: FilterPillMultiGroupProps<TId>) {
  const toggle = (id: TId) => {
    if (allOptionId !== undefined && id === allOptionId) {
      onChange([allOptionId]);
      return;
    }
    const without = allOptionId !== undefined ? value.filter((v) => v !== allOptionId) : value;
    const next = without.includes(id) ? without.filter((v) => v !== id) : [...without, id];
    if (next.length === 0 && allOptionId !== undefined) {
      onChange([allOptionId]);
      return;
    }
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {options.map((o) => {
        const active = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-small font-medium transition-colors duration-web-color',
              active
                ? 'border-accent bg-accent/[0.10] text-accent'
                : 'border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg-muted hover:border-accent/40 hover:text-fg',
            )}
          >
            {o.icon}
            <span>{o.label}</span>
            {o.count != null && (
              <span className="text-fg-subtle tabular-nums">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
