import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  /** Right-aligned link (e.g. "View full menu →"). Hidden on align='center'. */
  action?: { label: string; href: string };
  /** When set, used as the `id` on the `<h2>` so a parent `<section>` can `aria-labelledby` it. */
  id?: string;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-12 flex flex-col gap-4',
        align === 'center' && 'mb-12 items-center text-center',
        align === 'left' && action && 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-3', align === 'center' && 'items-center')}>
        {eyebrow && (
          <span className="text-eyebrow uppercase text-accent">{eyebrow}</span>
        )}
        <h2
          id={id}
          className="font-display text-h2 text-fg sm:text-h1"
          style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
        >
          {title}
        </h2>
        {description && (
          <p className="max-w-[640px] text-body-l text-fg-muted">{description}</p>
        )}
      </div>
      {action && align !== 'center' && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 self-start text-[15px] font-medium text-fg transition-colors hover:text-accent sm:self-end"
        >
          <span className="border-b border-fg/0 transition-colors group-hover:border-accent">
            {action.label}
          </span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
