'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { cn } from '../lib/cn';

export interface ModifierGroupShape {
  id: string;
  name: string;
  required: boolean;
  min: number;
  /** 1 → radio behavior, >1 → checkbox behavior. */
  max: number;
  options: ModifierOptionShape[];
}

export interface ModifierOptionShape {
  id: string;
  name: string;
  /** MoneyString delta (signed) — formatted via formatMoney. */
  priceDelta: string;
  default?: boolean;
  unavailable?: boolean;
}

export interface ModifierGroupProps {
  group: ModifierGroupShape;
  /** Array of selected option ids — radio = length 1, checkbox = length ≤ max. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Inline error (shown only after the user tries to submit with the group unfilled). */
  error?: string;
  currency: string;
  className?: string;
}

export function ModifierGroup({
  group,
  value,
  onChange,
  error,
  currency,
  className,
}: ModifierGroupProps) {
  const isMulti = group.max > 1;

  const hint = isMulti
    ? group.min > 0
      ? `Choose ${
          group.min === group.max
            ? group.min
            : `at least ${group.min}${group.max < 99 ? `, up to ${group.max}` : ''}`
        }`
      : `Optional · up to ${group.max}`
    : 'Choose one';

  const toggle = (option: ModifierOptionShape) => {
    if (option.unavailable) return;
    if (!isMulti) {
      onChange([option.id]);
      return;
    }
    const has = value.includes(option.id);
    if (has) {
      if (value.length <= group.min) return; // would violate min
      onChange(value.filter((v) => v !== option.id));
    } else {
      if (value.length >= group.max) return; // would violate max
      onChange([...value, option.id]);
    }
  };

  return (
    <fieldset className={cn('flex flex-col gap-3', className)} aria-invalid={!!error}>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="contents">
          <div className="text-h3 font-semibold text-fg">{group.name}</div>
        </legend>
        {group.required && group.min > 0 && (
          <span className="rounded-full bg-accent/[0.10] px-2 py-0.5 text-[11px] font-medium text-accent">
            Required
          </span>
        )}
      </div>
      <div className="text-small text-fg-subtle">{hint}</div>

      <div className="flex flex-col gap-1">
        {group.options.map((opt) => {
          const selected = value.includes(opt.id);
          const delta = parseFloat(opt.priceDelta);
          return (
            <label
              key={opt.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-input px-3 py-2.5 transition-colors',
                selected && 'bg-accent/[0.10]',
                opt.unavailable && 'cursor-not-allowed opacity-60',
                !selected && !opt.unavailable && 'hover:bg-surface-warm/40',
              )}
              onClick={(e) => {
                e.preventDefault();
                toggle(opt);
              }}
            >
              <span
                aria-hidden
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center border transition-colors',
                  isMulti ? 'rounded-sm' : 'rounded-full',
                  selected
                    ? 'border-accent bg-accent text-text-on-accent'
                    : 'border-border/[var(--border-strong-alpha)] bg-surface-2',
                )}
              >
                {selected &&
                  (isMulti ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-text-on-accent" />
                  ))}
              </span>
              <span className="flex-1 text-body text-fg">
                {opt.name}
                {opt.unavailable && (
                  <span className="ml-2 inline-block rounded-md bg-surface-warm px-1.5 py-0.5 text-[11px] text-fg-subtle">
                    Sold out
                  </span>
                )}
              </span>
              {delta !== 0 && (
                <span
                  className={cn(
                    'tabular-nums text-small',
                    delta < 0 ? 'text-positive' : 'text-fg-subtle',
                  )}
                >
                  {delta > 0 ? '+' : '−'}
                  {formatMoney(Math.abs(delta).toFixed(2), currency)}
                </span>
              )}
              <input
                type={isMulti ? 'checkbox' : 'radio'}
                className="sr-only"
                checked={selected}
                readOnly
                aria-required={group.required}
              />
            </label>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="text-small text-negative">
          {error}
        </div>
      )}
    </fieldset>
  );
}
