'use client';

import { Minus, Plus } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: { row: 'h-8', btn: 'h-8 w-8', value: 'w-7 text-small', icon: 12 },
  md: { row: 'h-10', btn: 'h-10 w-10', value: 'w-10 text-body', icon: 14 },
  lg: { row: 'h-12', btn: 'h-12 w-12', value: 'w-12 text-body-l', icon: 16 },
} as const;

/**
 * Numeric stepper with always-visible `−` and `+` buttons.
 *
 * Carry-over fix W4 (from web-02 carry-over #1 + web-03 carry-over #1):
 * the `+` was disappearing on hover in the SD source — here both buttons
 * always render, period.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  ariaLabel = 'Quantity',
  className,
}: QuantityStepperProps) {
  const sizing = SIZE_CLASSES[size];
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center overflow-hidden rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2',
        sizing.row,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
        className={cn(
          'grid place-items-center text-fg transition-colors hover:bg-surface-warm/60 disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent',
          sizing.btn,
        )}
      >
        <Minus size={sizing.icon} strokeWidth={2.4} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          'text-center font-medium tabular-nums text-fg',
          sizing.value,
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={!canIncrement}
        aria-label="Increase quantity"
        className={cn(
          'grid place-items-center text-fg transition-colors hover:bg-surface-warm/60 disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent',
          sizing.btn,
        )}
      >
        <Plus size={sizing.icon} strokeWidth={2.4} />
      </button>
    </div>
  );
}
