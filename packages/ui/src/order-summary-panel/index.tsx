'use client';

import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { type CartLineDisplay } from '../cart-line-item';
import { cn } from '../lib/cn';

export type DeliveryRow =
  | { amount: string }
  | { label: string };

export interface OrderSummaryPanelProps {
  lines: CartLineDisplay[];
  currency: string;
  /** All money values are MoneyStrings. */
  subtotal: string;
  delivery: DeliveryRow;
  discount?: { amount: string; label: string };
  tip?: string;
  total: string;
  showEditCart?: boolean;
  onEditCart?: () => void;
  /** Slot for <PromoCodeInput />. */
  promoInput?: React.ReactNode;
  /** Slot for the Place-order CTA + terms + payment-logos row. */
  ctaSlot?: React.ReactNode;
  /** 'sticky-rail' = right column on desktop checkout; 'inline' = full-width on confirmation. */
  variant?: 'sticky-rail' | 'inline';
  className?: string;
}

export function OrderSummaryPanel({
  lines,
  currency,
  subtotal,
  delivery,
  discount,
  tip,
  total,
  showEditCart = true,
  onEditCart,
  promoInput,
  ctaSlot,
  variant = 'sticky-rail',
  className,
}: OrderSummaryPanelProps) {
  return (
    <aside
      aria-label="Order summary"
      className={cn(
        'rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-6',
        variant === 'sticky-rail' && 'sticky top-[calc(theme(spacing.site-nav)+1.5rem)]',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-h3 font-semibold text-fg">Order summary</h3>
        {showEditCart && onEditCart && (
          <button
            type="button"
            onClick={onEditCart}
            className="text-small text-accent hover:underline"
          >
            Edit cart
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((line) => {
          const lineTotal = (parseFloat(line.unitPrice) * line.quantity).toFixed(2);
          return (
            <div key={line.id} className="flex items-start gap-3">
              {line.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={line.image}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="flex flex-1 flex-col leading-tight">
                <span className="text-small font-medium text-fg">{line.name}</span>
                {line.modifierSummary && (
                  <span className="text-[12px] text-fg-muted">{line.modifierSummary}</span>
                )}
                {line.notes && (
                  <span className="text-[12px] italic text-fg-subtle">Note: {line.notes}</span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end leading-tight">
                <span className="text-small text-fg-subtle">× {line.quantity}</span>
                <span className="text-small font-medium tabular-nums text-fg">
                  {formatMoney(lineTotal, currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {promoInput && (
        <>
          <div className="my-4 border-t border-border/[var(--border-alpha)]" />
          {promoInput}
        </>
      )}

      <div className="my-4 border-t border-border/[var(--border-alpha)]" />

      <div className="flex flex-col gap-2 text-small">
        <div className="flex items-baseline justify-between text-fg">
          <span className="text-fg-muted">Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
        </div>
        {discount && (
          <div className="flex items-baseline justify-between text-positive">
            <span>Discount · {discount.label}</span>
            <span className="tabular-nums">−{formatMoney(discount.amount, currency)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between text-fg">
          <span className="text-fg-muted">Delivery</span>
          <span
            className={cn(
              'tabular-nums',
              'label' in delivery && 'italic text-fg-subtle',
            )}
          >
            {'label' in delivery ? delivery.label : formatMoney(delivery.amount, currency)}
          </span>
        </div>
        {tip && parseFloat(tip) > 0 && (
          <div className="flex items-baseline justify-between text-fg">
            <span className="text-fg-muted">Tip</span>
            <span className="tabular-nums">{formatMoney(tip, currency)}</span>
          </div>
        )}
        <div className="my-2 border-t border-border/[var(--border-alpha)]" />
        <div className="flex items-baseline justify-between">
          <span className="font-display text-h3 font-medium text-fg">Total</span>
          <span className="font-display text-h3 font-medium tabular-nums text-fg">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      {ctaSlot && <div className="mt-5">{ctaSlot}</div>}
    </aside>
  );
}
