'use client';

import { useReviews } from '@/features/reviews/hooks';
import { Link } from '@/i18n/navigation';
import { mockTestimonials } from '@/lib/mock/szef-donald';
import { Container, SectionHeader, TestimonialCard } from '@repo/ui';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Pulls 3 recent positive reviews from the API. Falls back to the Szef
 * Donald mock when the API returns nothing — landing still has to feel
 * complete before reviews are collected.
 */
export function LandingTestimonials() {
  const t = useTranslations('web.marketing.home.testimonials');
  const reviewsQuery = useReviews();

  const realCards = React.useMemo(() => {
    const reviews = reviewsQuery.data?.items ?? [];
    return reviews
      .filter((r) => r.rating >= 4 && r.comment && r.comment.length > 0 && r.isVisible)
      .slice(0, 3)
      .map((r) => ({
        rating: r.rating,
        quote: r.comment ?? '',
        author: {
          name: r.authorName ?? t('anonymous'),
        },
        source: 'internal' as const,
      }));
  }, [reviewsQuery.data, t]);

  const cards =
    realCards.length >= 3
      ? realCards
      : mockTestimonials.slice(0, 3).map((card, i) => ({
          ...card,
          quote: t(`items.${i}.quote` as 'items.0.quote'),
          author: {
            ...card.author,
            name: t(`items.${i}.name` as 'items.0.name'),
            meta: t(`items.${i}.meta` as 'items.0.meta'),
          },
        }));

  return (
    <section aria-labelledby="reviews-h" className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <SectionHeader
          id="reviews-h"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          align="center"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((tc, i) => (
            <TestimonialCard key={i} {...tc} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            href="#"
            className="inline-flex items-center gap-1 text-[15px] font-medium text-fg hover:text-accent"
          >
            {t('readAllReviews')}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
