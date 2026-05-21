'use client';

import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../_shadcn/popover';
import { cn } from '../lib/cn';
import { STATUS_TOKENS, type VisualToken } from '../tokens/order';

export interface StatusPillProps<TStatus extends string = string> {
  status: TStatus;
  /** Override the token map (e.g. PaymentStatus → PAYMENT_TOKENS). Defaults to STATUS_TOKENS. */
  tokens?: Record<string, VisualToken>;
  size?: 'sm' | 'md';
  /** When present and non-empty, the pill becomes a button that opens an "Advance to" menu. */
  transitions?: TStatus[];
  onTransition?: (next: TStatus) => void;
  withDot?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Visual representation of an order's status. When `transitions` are passed
 * and `onTransition` is wired, the pill becomes interactive: click reveals
 * a popover with the legal next statuses (FSM enforced by the backend; this
 * is purely UI for discoverability).
 */
export function StatusPill<TStatus extends string = string>({
  status,
  tokens = STATUS_TOKENS as Record<string, VisualToken>,
  size = 'md',
  transitions,
  onTransition,
  withDot = true,
  disabled,
  className,
}: StatusPillProps<TStatus>) {
  const interactive = !!transitions && transitions.length > 0 && !!onTransition && !disabled;
  const tok = tokens[status] ?? {
    label: status,
    bg: 'bg-fg-subtle',
    text: 'text-fg-muted',
    tint: 'bg-fg-subtle/10',
    ring: 'ring-fg-subtle',
    varRef: 'var(--fg-subtle)',
  };

  const sizeCls = size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs';

  const inner = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeCls,
        tok.tint,
        tok.text,
        'border-border/[var(--border-strong-alpha)]',
        interactive && 'cursor-pointer hover:brightness-110',
        disabled && 'opacity-60',
        className,
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {withDot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tok.bg)} />}
      <span>{tok.label}</span>
      {interactive && <ChevronDown size={12} className="opacity-70" />}
    </span>
  );

  if (!interactive) return inner;

  return (
    <Popover>
      <PopoverTrigger asChild>{inner}</PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-fg-subtle">
          Advance to
        </div>
        {transitions?.map((next) => {
          const ntok = tokens[next] ?? {
            label: next,
            bg: 'bg-fg-subtle',
            text: 'text-fg',
            tint: '',
            ring: '',
            varRef: '',
          };
          return (
            <button
              key={next}
              type="button"
              onClick={() => onTransition?.(next)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', ntok.bg)} />
              <span>{ntok.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
