'use client';

import { useReviews } from '@/features/reviews/hooks';
import { mockTestimonials } from '@/lib/mock/szef-donald';
import { Container, SectionHeader, TestimonialCard } from '@repo/ui';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

/**
 * Pulls 3 recent positive reviews from the API. Falls back to the Szef
 * Donald mock when the API returns nothing — landing still has to feel
 * complete before reviews are collected.
 */
export function LandingTestimonials() {
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
          name: r.authorName ?? 'Anonymous',
        },
        source: 'internal' as const,
      }));
  }, [reviewsQuery.data]);

  const cards = realCards.length >= 3 ? realCards : mockTestimonials.slice(0, 3);

  return (
    <section aria-labelledby="reviews-h" className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container>
        <SectionHeader
          id="reviews-h"
          eyebrow="Reviews"
          title="Trusted by thousands."
          description="4.8 average rating across 1,247 reviews on Google."
          align="center"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            href="#"
            className="inline-flex items-center gap-1 text-[15px] font-medium text-fg hover:text-accent"
          >
            Read all reviews
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
