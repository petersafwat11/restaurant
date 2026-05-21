'use client';

import { Check, X } from 'lucide-react';
import * as React from 'react';
import type { OrderStatus, OrderType } from '@repo/types';
import { ORDER_TRACKING_STEPS, trackingStateFor } from '../tokens/order-tracking';
import { cn } from '../lib/cn';

export interface OrderProgressStepperProps {
  mode: OrderType;
  status: OrderStatus;
  className?: string;
}

/**
 * Horizontal order-progress stepper for the success / tracking pages.
 *
 * Step labels derive from `mode` via ORDER_TRACKING_STEPS. CANCELLED and
 * REFUNDED render a terminal-failure row (brick X + "Cancelled"/"Refunded")
 * rather than progressing the steps — these are dead-ends, not steps.
 */
export function OrderProgressStepper({ mode, status, className }: OrderProgressStepperProps) {
  const state = trackingStateFor(mode, status);

  if (state.kind === 'cancelled' || state.kind === 'refunded') {
    return (
      <div
        role="status"
        className={cn(
          'flex items-center justify-center gap-3 rounded-card border border-negative/20 bg-negative/10 px-4 py-3 text-fg',
          className,
        )}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-negative text-text-on-accent">
          <X size={14} strokeWidth={3} />
        </span>
        <span className="text-body font-semibold">
          {state.kind === 'cancelled' ? 'Cancelled' : 'Refunded'}
        </span>
      </div>
    );
  }

  const steps = ORDER_TRACKING_STEPS[mode];
  const current = state.index;

  return (
    <ol
      aria-label="Order progress"
      className={cn('flex items-center justify-between gap-3', className)}
    >
      {steps.map((label, i) => {
        const stateKind = i < current ? 'complete' : i === current ? 'current' : 'pending';
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full text-small font-semibold',
                  stateKind === 'complete' && 'bg-positive text-text-on-accent',
                  stateKind === 'current' && 'bg-accent text-text-on-accent',
                  stateKind === 'pending' &&
                    'border border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg-subtle',
                )}
              >
                {stateKind === 'complete' ? (
                  <Check size={14} strokeWidth={3} />
                ) : stateKind === 'current' ? (
                  <span className="h-2 w-2 rounded-full bg-text-on-accent" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'text-[12px] font-medium leading-tight',
                  stateKind === 'pending' ? 'text-fg-subtle' : 'text-fg',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'h-px flex-1',
                  i < current ? 'bg-positive' : 'bg-border/[var(--border-strong-alpha)]',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
