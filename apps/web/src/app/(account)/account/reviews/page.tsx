'use client';

import { useMyReviews } from '@/features/reviews/hooks';
import { EmptyState, Spinner, Stars } from '@repo/ui';
import { Star } from 'lucide-react';

export default function MyReviewsPage() {
  const query = useMyReviews();
  const reviews = query.data?.items ?? [];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h2 text-fg">My reviews</h1>
        <p className="mt-1 text-small text-fg-muted">Feedback you've left on past orders.</p>
      </header>

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          size="lg"
          icon={<Star size={56} strokeWidth={1.25} />}
          title="No reviews yet"
          description="After your next order, you can leave a review."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} size={16} />
                <span className="text-[12px] text-fg-subtle">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="m-0 text-body text-fg">{r.comment}</p>}
              {r.ownerReply && (
                <div className="mt-2 rounded-md bg-accent/[0.06] p-3">
                  <div className="text-[12px] font-medium text-accent">From Szef Donald</div>
                  <p className="mt-1 text-small text-fg">{r.ownerReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
