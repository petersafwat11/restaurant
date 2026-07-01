'use client';

import { useReviews } from '@/features/reviews/hooks';
import { GOOGLE_REVIEWS_URL } from '@/lib/brand';
import { Container, SectionHeader, TestimonialCard } from '@repo/ui';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Pulls recent positive reviews from the API. There is NO mock fallback
 * (Phase H1): if fewer than three real, visible reviews exist, the whole
 * section is hidden so the landing never advertises fabricated testimonials.
 * (This section is currently not mounted on the homepage — see page.tsx — but
 * it stays live-or-hide so it can't regress to mock content if re-enabled.)
 */
export function LandingTestimonials() {
  const t = useTranslations('web.marketing.home.testimonials');
  const reviewsQuery = useReviews();

  const cards = React.useMemo(() => {
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

  // Not enough real reviews to fill the row → hide rather than pad with mocks.
  if (cards.length < 3) return null;

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
          {cards.map((tc) => (
            <TestimonialCard
              key={tc.author.name}
              {...tc}
              starsAriaLabel={t('starsAriaLabel', { value: tc.rating })}
            />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[15px] font-medium text-fg hover:text-accent"
          >
            {t('readAllReviews')}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </Container>
    </section>
  );
}
