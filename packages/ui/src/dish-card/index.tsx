'use client';

import { Flame, Leaf, Plus, Sparkles, WheatOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { cn } from '../lib/cn';
import { DISH_FLAG_CLASSES, DISH_FLAG_TOKENS, type DishFlag } from '../tokens/dish-flags';

const FLAG_ICONS = {
  leaf: Leaf,
  'wheat-off': WheatOff,
  flame: Flame,
  sparkles: Sparkles,
} as const;

export interface DishCardProps {
  /** Deep-link URL (e.g. /menu/items/<slug>). On menu page, the card opens a sheet — the consumer handles `onClick`. */
  href: string;
  image: { src: string; alt: string; priority?: boolean; sizes?: string };
  name: string;
  description?: string;
  price: { amount: string; currency: string };
  flags?: DishFlag[];
  /** Quick-add `+` button — when present, button is visible; absent hides it. */
  onAdd?: () => void;
  unavailable?: boolean;
  /** Reserve 24px min-height on the flag row even when empty (keeps grid even). Default true on menu, can be false on landing. */
  reserveFlagSpace?: boolean;
  /** Override href click behavior — return false to skip navigation (used by menu page to open sheet). */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  className?: string;
  /**
   * Optional translated chip labels per flag. Falls back to the hardcoded
   * English label from `DISH_FLAG_TOKENS` when a flag isn't provided.
   */
  flagLabels?: Partial<Record<DishFlag, string>>;
  /** Aria-label template for the quick-add button. Receives the dish name. */
  formatAddAriaLabel?: (name: string) => string;
  /** Sold-out chip text. Defaults to "Sold out today". */
  soldOutLabel?: string;
}

function FlagChip({
  flag,
  label,
}: {
  flag: DishFlag;
  label?: string;
}) {
  const meta = DISH_FLAG_TOKENS[flag];
  const Icon = FLAG_ICONS[meta.icon];
  const text = label ?? meta.label;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        DISH_FLAG_CLASSES[meta.token],
      )}
      title={text}
    >
      <Icon size={11} strokeWidth={2} />
      {text}
    </span>
  );
}

export function DishCard({
  href,
  image,
  name,
  description,
  price,
  flags,
  onAdd,
  unavailable,
  reserveFlagSpace = true,
  onClick,
  className,
  flagLabels,
  formatAddAriaLabel,
  soldOutLabel = 'Sold out today',
}: DishCardProps) {
  const sizes = image.sizes ?? '(max-width: 768px) 80vw, (max-width: 1024px) 50vw, 33vw';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd?.();
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-border/[var(--border-alpha)] bg-surface-2 text-fg shadow-sm transition-shadow duration-web-color hover:shadow-md',
        unavailable && 'opacity-60',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-warm/40">
        {image.src ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            priority={image.priority}
            className="object-cover transition-transform duration-web-motion ease-web-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-fg-subtle/50 text-4xl font-display"
          >
            {/* No photo configured — render a soft brand placeholder. */}
            ◍
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5',
            reserveFlagSpace && 'min-h-6',
          )}
        >
          {unavailable ? (
            <span className="inline-flex items-center rounded-md bg-surface-warm px-1.5 py-0.5 text-[11px] font-medium text-fg-subtle">
              {soldOutLabel}
            </span>
          ) : (
            flags?.map((f) => (
              <FlagChip key={f} flag={f} label={flagLabels?.[f]} />
            ))
          )}
        </div>
        <h3 className="text-h3 font-semibold leading-snug text-fg">{name}</h3>
        {description && (
          <p
            className="text-small text-fg-muted"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="font-display text-price font-medium tabular-nums text-fg">
            {formatMoney(price.amount, price.currency)}
          </span>
          {onAdd && !unavailable && (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={
                formatAddAriaLabel ? formatAddAriaLabel(name) : `Add ${name} to cart`
              }
              className="grid h-10 w-10 place-items-center rounded-input bg-accent text-text-on-accent transition-colors hover:bg-accent-hover"
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
