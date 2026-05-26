'use client';

import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { Sheet, SheetContent, SheetTitle } from '../_shadcn/sheet';
import { CartLineItem, type CartLineDisplay } from '../cart-line-item';
import { EmptyState } from '../empty-state';
import { cn } from '../lib/cn';

export interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLineDisplay[];
  onUpdateQty: (lineId: string, qty: number) => void;
  onRemove: (lineId: string) => void;
  onCheckout: () => void;
  /** MoneyString. */
  subtotal: string;
  currency: string;
  /** Optional kitchen-notes block — omit to hide. */
  notes?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  /** Empty-state action override. Defaults to "Browse menu" → close sheet. */
  emptyAction?: { label: string; onClick?: () => void; href?: string };
  /** Localizable labels. */
  labels?: {
    /** Header title. Defaults to "Your cart". */
    title?: React.ReactNode;
    /** Aria-label for the close (X) button. Defaults to "Close cart". */
    closeAriaLabel?: string;
    /**
     * Render the count badge ("(3 items)" / "(1 item)"). Receives the item
     * count. Defaults to English pluralization.
     */
    formatItemCount?: (count: number) => React.ReactNode;
    /** Empty-state title. Defaults to "Your cart is empty". */
    emptyTitle?: string;
    /** Empty-state description. Defaults to "Browse the menu and add something tasty.". */
    emptyDescription?: React.ReactNode;
    /** Default label for the empty-state action when `emptyAction` is not passed. */
    emptyActionLabel?: string;
    /** Notes-textarea label. Defaults to "Notes for the kitchen". */
    notesLabel?: React.ReactNode;
    /** Default notes textarea placeholder when `notes.placeholder` is not provided. */
    notesPlaceholder?: string;
    /** Subtotal row label. Defaults to "Subtotal". */
    subtotal?: React.ReactNode;
    /** Delivery row label. Defaults to "Delivery". */
    delivery?: React.ReactNode;
    /** Delivery row value. Defaults to "Calculated at checkout". */
    deliveryValue?: React.ReactNode;
    /** Total row label. Defaults to "Total". */
    total?: React.ReactNode;
    /**
     * Render the checkout-button text. Receives the formatted total. Defaults
     * to `Checkout · ${total}`.
     */
    checkoutCta?: (total: string) => React.ReactNode;
    /** Optional hint shown below the checkout button. */
    footerHint?: React.ReactNode;
    /** Forwarded to each CartLineItem for in-row strings. */
    lineItem?: {
      remove?: string;
      notePrefix?: string;
      quantityAriaLabel?: (name: string) => string;
    };
  };
}

/**
 * Right-side slide-in cart drawer — width 480px desktop, full-width mobile.
 *
 * Wraps shadcn Sheet for focus-trap + Esc + backdrop + slide animation; the
 * web-themed styling (cream surfaces, copper CTA) layers on top.
 */
export function CartSheet({
  open,
  onOpenChange,
  lines,
  onUpdateQty,
  onRemove,
  onCheckout,
  subtotal,
  currency,
  notes,
  emptyAction,
  labels,
}: CartSheetProps) {
  const {
    title = 'Your cart',
    closeAriaLabel = 'Close cart',
    formatItemCount,
    emptyTitle = 'Your cart is empty',
    emptyDescription = 'Browse the menu and add something tasty.',
    emptyActionLabel = 'Browse menu',
    notesLabel = 'Notes for the kitchen',
    notesPlaceholder = 'Anything we should know about your order?',
    subtotal: subtotalLabel = 'Subtotal',
    delivery: deliveryLabel = 'Delivery',
    deliveryValue = 'Calculated at checkout',
    total: totalLabel = 'Total',
    checkoutCta,
    footerHint = 'Free baklava on first order — code at checkout.',
  } = labels ?? {};
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const formattedTotal = formatMoney(subtotal, currency);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
          side="right"
          hideCloseButton
          className="!w-[480px] !max-w-full !bg-surface !border-l-0 flex flex-col gap-0 p-0 shadow-lg"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/[var(--border-alpha)] px-6">
            <div className="flex items-baseline gap-2">
              <SheetTitle asChild>
                <h2 className="font-display text-h3 font-medium text-fg">{title}</h2>
              </SheetTitle>
              {lines.length > 0 && (
                <span className="text-small text-fg-subtle">
                  {formatItemCount
                    ? formatItemCount(itemCount)
                    : `(${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={closeAriaLabel}
              className="grid h-9 w-9 place-items-center rounded-full text-fg transition-colors hover:bg-surface-warm/40"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <EmptyState
                size="lg"
                icon={<ShoppingBag size={56} strokeWidth={1.25} />}
                title={emptyTitle}
                description={emptyDescription}
                action={
                  emptyAction ?? {
                    label: emptyActionLabel,
                    onClick: () => onOpenChange(false),
                  }
                }
              />
            ) : (
              <div className="flex flex-col gap-4 p-6">
                {lines.map((line) => (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    onUpdateQty={(q) => onUpdateQty(line.id, q)}
                    onRemove={() => onRemove(line.id)}
                    currency={currency}
                    labels={labels?.lineItem}
                  />
                ))}
                {notes && (
                  <div className="mt-4 flex flex-col gap-2">
                    <label
                      htmlFor="cart-notes"
                      className="text-caption uppercase tracking-wide text-fg-subtle"
                    >
                      {notesLabel}
                    </label>
                    <textarea
                      id="cart-notes"
                      rows={3}
                      maxLength={200}
                      placeholder={notes.placeholder ?? notesPlaceholder}
                      value={notes.value}
                      onChange={(e) => notes.onChange(e.target.value)}
                      className="resize-none rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 p-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="shrink-0 border-t border-border/[var(--border-alpha)] bg-surface-2 p-6">
              <div className="flex flex-col gap-3 text-body">
                <div className="flex items-baseline justify-between text-fg">
                  <span className="text-fg-muted">{subtotalLabel}</span>
                  <span className="tabular-nums">{formattedTotal}</span>
                </div>
                <div className="flex items-baseline justify-between text-fg-subtle">
                  <span>{deliveryLabel}</span>
                  <span className="italic">{deliveryValue}</span>
                </div>
                <div className="border-t border-border/[var(--border-alpha)]" />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-h3 font-medium text-fg">{totalLabel}</span>
                  <span className="font-display text-h3 font-medium tabular-nums text-fg">
                    {formattedTotal}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCheckout}
                className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
              >
                {checkoutCta ? checkoutCta(formattedTotal) : `Checkout · ${formattedTotal}`}
                <ArrowRight size={18} />
              </button>
              {footerHint && (
                <p className="mt-3 text-center text-[12px] text-fg-subtle">{footerHint}</p>
              )}
            </div>
          )}
        </SheetContent>
    </Sheet>
  );
}
