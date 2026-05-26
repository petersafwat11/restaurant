'use client';

import { ShoppingBag } from 'lucide-react';

interface CartButtonProps {
  count?: number;
  onClick?: () => void;
  /** Translated aria-label. Falls back to English when absent. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Cart icon button for SiteNav. Shows a copper count bubble when items > 0.
 * The bubble is hidden during SSR until the cart store hydrates from the
 * `cart_session` cookie — the consumer (cart-container) handles that, this
 * button just renders what it's given.
 */
export function CartButton({ count = 0, onClick, ariaLabel, className }: CartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Cart, ${count} item${count === 1 ? '' : 's'}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors duration-web-color hover:bg-surface-warm/40 ${className ?? ''}`}
    >
      <ShoppingBag size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-text-on-accent tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
