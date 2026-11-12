'use client';

import { useRestaurant } from '@/features/restaurants/hooks';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * "Smakowało? Zostaw opinię w Google" — shown once an order was handed over.
 * The link comes from restaurant settings (`googleReviewUrl`, editable in
 * admin); nothing renders when it is not configured. Google policy: the same
 * neutral ask for every customer — no incentive, no satisfaction filter.
 */
export function GoogleReviewLink({ className }: { className?: string }) {
  const t = useTranslations('web.public.track.googleReview');
  const { data: restaurant } = useRestaurant();
  const url = restaurant?.googleReviewUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] px-6 text-[15px] font-medium text-fg transition-colors hover:border-accent/40 hover:text-accent ${className ?? ''}`}
    >
      <Star size={16} strokeWidth={2} aria-hidden />
      {t('cta')}
    </a>
  );
}
