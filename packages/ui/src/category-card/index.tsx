import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface CategoryCardProps {
  href: string;
  image: { src: string; alt: string; priority?: boolean; sizes?: string };
  label: string;
  itemCount?: number;
  /** Pre-formatted, translated item count string (e.g. "5 items"). When present, shown instead of the English fallback. */
  itemCountLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Portrait 4:5 image card used in the landing Categories strip.
 *
 * Composes `next/image` internally with sensible `sizes` defaults so
 * Lighthouse perf stays high without callers having to remember per-breakpoint
 * sizing.
 */
export function CategoryCard({
  href,
  image,
  label,
  itemCount,
  itemCountLabel,
  size = 'md',
  className,
}: CategoryCardProps) {
  const sizes =
    image.sizes ?? '(max-width: 768px) 70vw, (max-width: 1024px) 33vw, 20vw';

  return (
    <Link
      href={href}
      className={cn(
        'group relative block aspect-[4/5] overflow-hidden rounded-card bg-surface-warm/40',
        size === 'sm' && 'max-w-[200px]',
        size === 'lg' && 'aspect-[3/4]',
        className,
      )}
    >
      {image.src ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={image.priority}
          className="object-cover transition-transform duration-web-motion ease-web-out group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-full w-full items-center justify-center bg-surface-warm/40 text-fg-subtle/50 text-4xl font-display"
        >
          ◍
        </div>
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-fg/70 via-fg/10 to-transparent transition-opacity duration-web-color group-hover:from-fg/80"
      />
      <div className="absolute bottom-5 left-5 right-5 text-text-on-accent">
        <div className="font-display text-[28px] font-medium leading-tight text-white">
          {label}
        </div>
        {itemCount != null && (
          <div className="mt-1 text-small text-white/85">
            {itemCountLabel ?? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </div>
        )}
      </div>
    </Link>
  );
}
