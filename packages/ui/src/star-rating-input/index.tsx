'use client';

import { Star } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface StarRatingInputProps {
  /** Current rating, 0 (unset) through 5. */
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
  /** Accessible label for the rating group. */
  ariaLabel?: string;
  /** Accessible label per star, receives the star value (1–5). */
  starLabel?: (value: number) => string;
  className?: string;
}

/**
 * Interactive 1–5 star rating input — the editable counterpart to the
 * display-only `Stars`. Implemented as a roving-tabindex radiogroup: arrow
 * keys move the selection, hover previews the value. Copper fill matches
 * `Stars` so a submitted rating reads identically on the reviews page.
 */
export function StarRatingInput({
  value,
  onChange,
  size = 28,
  disabled = false,
  ariaLabel,
  starLabel,
  className,
}: StarRatingInputProps) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? 'Rating'}
      className={cn('inline-flex items-center gap-1', disabled && 'opacity-60', className)}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= shown;
        // Roving tabindex: the selected star is the tab stop; when unset, star 1 is.
        const isTabStop = value === star || (value === 0 && star === 1);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={starLabel ? starLabel(star) : `${star} star${star === 1 ? '' : 's'}`}
            disabled={disabled}
            tabIndex={disabled ? -1 : isTabStop ? 0 : -1}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                onChange(Math.min(5, (value || 0) + 1));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                onChange(Math.max(1, (value || 1) - 1));
              }
            }}
            className={cn(
              'rounded-sm p-0.5 outline-none transition-transform',
              !disabled && 'hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/40',
              disabled && 'cursor-default',
            )}
          >
            <Star
              size={size}
              strokeWidth={filled ? 0 : 1.5}
              fill={filled ? 'currentColor' : 'none'}
              className={filled ? 'text-accent' : 'text-fg-disabled'}
            />
          </button>
        );
      })}
    </div>
  );
}
