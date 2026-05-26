import { Star } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface StarsProps {
  /** 0–5, supports 0.5 increments. */
  value: number;
  size?: number;
  /** Accessible label for the stars group. Falls back to English when absent. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Rating row — 5 copper stars with half-fill support.
 *
 * Sub-primitive used by TestimonialCard and Hero's rating slot. Renders
 * inline-flex so it composes with adjacent text.
 */
export function Stars({ value, size = 16, ariaLabel, className }: StarsProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `${value} out of 5 stars`}
      className={cn('inline-flex items-center gap-0.5 text-accent', className)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        if (fill === 1) return <Star key={i} size={size} fill="currentColor" strokeWidth={0} />;
        if (fill === 0)
          return (
            <Star
              key={i}
              size={size}
              strokeWidth={1.5}
              className="text-fg-disabled"
            />
          );
        // Half: composite a filled clip + an outline stroke
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} className="absolute inset-0 text-fg-disabled" />
            <span
              aria-hidden
              className="absolute inset-0 overflow-hidden"
              style={{ width: size * fill }}
            >
              <Star size={size} fill="currentColor" strokeWidth={0} className="text-accent" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
