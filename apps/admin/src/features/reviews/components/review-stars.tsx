'use client';

import { Star } from 'lucide-react';
import * as React from 'react';

interface Props {
  rating: number;
  size?: number;
}

export function ReviewStars({ rating, size = 12 }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? 'fill-warning text-warning' : 'text-fg-subtle'}
        />
      ))}
    </div>
  );
}
