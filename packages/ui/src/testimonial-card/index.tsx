import * as React from 'react';
import { Stars } from '../stars';
import { cn } from '../lib/cn';

export interface TestimonialCardProps {
  quote: string;
  author: {
    name: string;
    meta?: string;
    /** Optional avatar URL. If absent, falls back to an initial-letter chip in copper-muted bg. */
    avatar?: string;
  };
  /** 1–5, 0.5 increments. */
  rating: number;
  source?: 'google' | 'tripadvisor' | 'facebook' | 'internal';
  className?: string;
}

const SOURCE_LABELS: Record<NonNullable<TestimonialCardProps['source']>, string> = {
  google: 'Google',
  tripadvisor: 'Tripadvisor',
  facebook: 'Facebook',
  internal: 'Szef Donald',
};

export function TestimonialCard({
  quote,
  author,
  rating,
  source,
  className,
}: TestimonialCardProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col gap-4 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-6',
        className,
      )}
    >
      <Stars value={rating} size={16} />
      <p
        className="m-0 text-body-l text-fg"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '6rem' /* reserve 3 lines */,
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-auto flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/[0.10] text-small font-semibold text-accent">
          {author.name.charAt(0)}
        </div>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-small font-semibold text-fg">{author.name}</span>
          {author.meta && <span className="text-[12px] text-fg-subtle">{author.meta}</span>}
        </div>
        {source && (
          <span className="rounded-full border border-border/[var(--border-strong-alpha)] bg-surface px-2 py-1 text-[11px] text-fg-muted">
            {SOURCE_LABELS[source]}
          </span>
        )}
      </div>
    </article>
  );
}
