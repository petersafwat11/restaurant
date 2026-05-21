import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Container } from '../container';
import { cn } from '../lib/cn';

export interface HeroProps {
  eyebrow?: string;
  /** Hero headline — can contain `<em>` for accent italic words. */
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Right-column visual (image, video, composition). */
  media: React.ReactNode;
  /** Floating chips/badges positioned over the media — typically 1–2 absolute-positioned cards. */
  decoration?: React.ReactNode;
  /** Below-CTA rating row. */
  rating?: { value: number; count: number; renderStars?: (value: number) => React.ReactNode };
  /** Optional decorative background (e.g. half-off-edge hexagon). */
  background?: React.ReactNode;
  layout?: 'split' | 'stacked';
}

/**
 * Customer landing/about hero. 55/45 split on desktop, stacked on mobile.
 * The media slot fills the right column; decoration slot is positioned
 * relative to it (consumer applies absolute positioning).
 */
export function Hero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  media,
  decoration,
  rating,
  background,
  layout = 'split',
}: HeroProps) {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-bg pb-20 pt-12 sm:pb-24 sm:pt-20"
    >
      {background}
      <Container>
        <div
          className={cn(
            'grid gap-12 lg:gap-16',
            layout === 'split' && 'lg:grid-cols-[55fr_45fr] lg:items-center',
          )}
        >
          <div className="flex flex-col gap-6">
            {eyebrow && (
              <span className="text-eyebrow uppercase text-accent">{eyebrow}</span>
            )}
            <h1
              className="font-display text-h1 text-fg sm:text-hero"
              style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
            >
              {title}
            </h1>
            {description && (
              <p className="max-w-[480px] text-body-l text-fg-muted">{description}</p>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="flex flex-wrap gap-4">
                {primaryCta && (
                  <Link
                    href={primaryCta.href}
                    className="inline-flex h-12 items-center gap-2 rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    {primaryCta.label}
                    <ArrowRight size={18} />
                  </Link>
                )}
                {secondaryCta && (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex h-12 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-6 text-[15px] font-medium text-fg transition-colors hover:bg-surface-warm/40"
                  >
                    {secondaryCta.label}
                  </Link>
                )}
              </div>
            )}
            {rating && (
              <div className="flex items-center gap-3 text-small">
                {rating.renderStars?.(rating.value)}
                <span className="font-medium tabular-nums text-fg">{rating.value.toFixed(1)}</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-fg-subtle" />
                <span className="text-fg-subtle">
                  Based on {rating.count.toLocaleString()} Google reviews
                </span>
              </div>
            )}
          </div>
          <div className="relative">
            {media}
            {decoration}
          </div>
        </div>
      </Container>
    </section>
  );
}
