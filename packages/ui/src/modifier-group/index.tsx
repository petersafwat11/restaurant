'use client';

import { formatMoney } from '@repo/utils';
import { Check } from 'lucide-react';
import * as React from 'react';
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
  /** Meat weight in grams for this option (size options); shown next to the name. */
  grams?: number | null;
  default?: boolean;
  unavailable?: boolean;
}

/** Localizable copy for a modifier group. Defaults are English. */
export interface ModifierGroupLabels {
  /** Chip on required groups. Default "Required". */
  required?: string;
  /** Hint for single-choice groups. Default "Choose one". */
  chooseOne?: string;
  /** Hint for optional multi-choice groups. Default `Optional · up to ${max}`. */
  optionalUpTo?: (max: number) => string;
  /** Hint when exactly n must be chosen. Default `Choose ${n}`. */
  chooseExactly?: (n: number) => string;
  /** Hint for a min..max range (max undefined = no upper limit). */
  chooseRange?: (min: number, max?: number) => string;
  /** Chip on unavailable options. Default "Sold out". */
  soldOut?: string;
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
  labels?: ModifierGroupLabels;
}

export function ModifierGroup({
  group,
  value,
  onChange,
  error,
  currency,
  className,
  labels,
}: ModifierGroupProps) {
  const isMulti = group.max > 1;
  const {
    required: requiredLabel = 'Required',
    chooseOne = 'Choose one',
    optionalUpTo = (max: number) => `Optional · up to ${max}`,
    chooseExactly = (n: number) => `Choose ${n}`,
    chooseRange = (min: number, max?: number) =>
      `Choose at least ${min}${max !== undefined ? `, up to ${max}` : ''}`,
    soldOut: soldOutLabel = 'Sold out',
  } = labels ?? {};

  const hint = isMulti
    ? group.min > 0
      ? group.min === group.max
        ? chooseExactly(group.min)
        : chooseRange(group.min, group.max < 99 ? group.max : undefined)
      : optionalUpTo(group.max)
    : chooseOne;

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
          <span className="shrink-0 rounded-full bg-accent/[0.10] px-2 py-0.5 text-[11px] font-medium text-accent">
            {requiredLabel}
          </span>
        )}
      </div>
      <div className="text-small text-fg-subtle">{hint}</div>

      <div className="flex flex-col gap-1">
        {group.options.map((opt) => {
          const selected = value.includes(opt.id);
          const delta = Number.parseFloat(opt.priceDelta);
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
              <span className="min-w-0 flex-1 text-body text-fg">
                {opt.name}
                {opt.grams != null && opt.grams > 0 && (
                  <span className="ml-2 text-small tabular-nums text-fg-subtle">{opt.grams} g</span>
                )}
                {opt.unavailable && (
                  <span className="ml-2 inline-block rounded-md bg-surface-warm px-1.5 py-0.5 text-[11px] text-fg-subtle">
                    {soldOutLabel}
                  </span>
                )}
              </span>
              {delta !== 0 && (
                <span
                  className={cn(
                    'shrink-0 tabular-nums text-small',
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
