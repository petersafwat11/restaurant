'use client';

import { cn } from '@repo/ui';
import { Check, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useReviewedOrderIds } from '../hooks';
import { ReviewDialog } from './review-dialog';

export interface ReviewCtaProps {
  orderId: string;
  /** `block` = full-width button (order detail); `compact` = inline row action. */
  variant?: 'block' | 'compact';
}

/**
 * "Write a review" affordance for a completed/delivered order. Renders a
 * confirmation badge instead once the order has been reviewed. Caller is
 * responsible for only mounting this when the order status is reviewable.
 */
export function ReviewCta({ orderId, variant = 'compact' }: ReviewCtaProps) {
  const t = useTranslations('web.account.reviews');
  const reviewedIds = useReviewedOrderIds();
  const [open, setOpen] = React.useState(false);

  if (reviewedIds.has(orderId)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-small font-medium text-positive">
        <Check size={15} strokeWidth={2.4} />
        {t('reviewed')}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] font-medium text-fg transition-colors hover:bg-surface-warm/40',
          variant === 'block' ? 'h-12 w-full px-6 text-[15px]' : 'h-9 px-4 text-small',
        )}
      >
        <Star size={15} />
        {t('writeReview')}
      </button>
      <ReviewDialog orderId={orderId} open={open} onOpenChange={setOpen} />
    </>
  );
}
