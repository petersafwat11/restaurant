'use client';

import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { QuantityStepper } from '../quantity-stepper';
import { cn } from '../lib/cn';

/**
 * Display projection of a cart line — primitives stay free of `@repo/types`
 * DTO shapes (caller adapts CartItemDto → CartLineDisplay at the feature
 * boundary).
 */
export interface CartLineDisplay {
  id: string;
  name: string;
  image?: string;
  /** MoneyString — primitive renders via formatMoney. */
  unitPrice: string;
  quantity: number;
  /** Pre-joined modifier summary, e.g. "Mega · Beef and lamb · Tahini". */
  modifierSummary?: string;
  notes?: string;
}

export interface CartLineItemProps {
  line: CartLineDisplay;
  onUpdateQty?: (qty: number) => void;
  onRemove?: () => void;
  variant?: 'editable' | 'readonly';
  currency: string;
  className?: string;
}

export function CartLineItem({
  line,
  onUpdateQty,
  onRemove,
  variant = 'editable',
  currency,
  className,
}: CartLineItemProps) {
  const lineTotal = (parseFloat(line.unitPrice) * line.quantity).toFixed(2);

  return (
    <div className={cn('flex gap-3', className)}>
      {line.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={line.image}
          alt=""
          className="h-20 w-20 shrink-0 rounded-image object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="text-body font-semibold text-fg">{line.name}</div>
        {line.modifierSummary && (
          <div className="text-small text-fg-muted">{line.modifierSummary}</div>
        )}
        {line.notes && (
          <div className="text-small text-fg-subtle">Note: {line.notes}</div>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <div className="text-small font-semibold tabular-nums text-fg">
          {formatMoney(lineTotal, currency)}
        </div>
        {variant === 'editable' && onUpdateQty && (
          <>
            <QuantityStepper
              value={line.quantity}
              onChange={onUpdateQty}
              size="sm"
              ariaLabel={`Quantity for ${line.name}`}
            />
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-[12px] text-fg-subtle transition-colors hover:text-negative"
              >
                Remove
              </button>
            )}
          </>
        )}
        {variant === 'readonly' && (
          <span className="text-small text-fg-muted">× {line.quantity}</span>
        )}
      </div>
    </div>
  );
}
