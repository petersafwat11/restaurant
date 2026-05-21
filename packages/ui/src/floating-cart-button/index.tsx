'use client';

import { ShoppingBag } from 'lucide-react';
import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { cn } from '../lib/cn';

export interface FloatingCartButtonProps {
  itemCount: number;
  total: string;
  currency: string;
  onClick: () => void;
  /** 'br' = bottom-right (desktop), 'bc' = bottom-center (mobile). */
  position?: 'br' | 'bc';
  /** Explicit hide override — the consumer (cart-container) computes this from usePathname(). */
  hidden?: boolean;
  className?: string;
}

/**
 * Persistent floating CTA — visible whenever the cart has items.
 *
 * No router imports inside `@repo/ui` per architecture decision §12 ¶16. The
 * `cart-container.tsx` reads `usePathname()` and passes `hidden` down.
 */
export function FloatingCartButton({
  itemCount,
  total,
  currency,
  onClick,
  position = 'br',
  hidden,
  className,
}: FloatingCartButtonProps) {
  if (hidden || itemCount === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View cart, ${itemCount} items, ${formatMoney(total, currency)}`}
      className={cn(
        'fixed z-30 inline-flex h-14 items-center gap-3 rounded-button bg-accent px-5 text-[15px] font-medium text-text-on-accent shadow-md transition-transform duration-web-motion hover:bg-accent-hover',
        position === 'br'
          ? 'bottom-8 right-8'
          : 'bottom-4 left-4 right-4 mx-auto w-[calc(100%-2rem)] justify-center sm:left-1/2 sm:w-[min(90vw,28rem)] sm:-translate-x-1/2',
        'animate-toast-in',
        className,
      )}
    >
      <ShoppingBag size={20} strokeWidth={1.75} />
      <span>View cart</span>
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-2 text-[12px] tabular-nums">
        {itemCount}
      </span>
      <span aria-hidden className="h-1 w-1 rounded-full bg-white/40" />
      <span className="tabular-nums">{formatMoney(total, currency)}</span>
    </button>
  );
}
