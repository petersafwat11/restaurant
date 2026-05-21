import Link from 'next/link';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: { wrap: 'py-8 px-4', icon: 'mb-3', title: 'text-body font-semibold' },
  md: { wrap: 'py-12 px-6', icon: 'mb-4', title: 'text-body-l font-semibold' },
  lg: { wrap: 'py-20 px-6', icon: 'mb-6', title: 'text-h3 font-semibold' },
} as const;

/**
 * Empty state — used for empty cart, empty search results, no orders,
 * empty address book, etc. Intentionally tiny.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizing = SIZE_CLASSES[size];
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizing.wrap,
        className,
      )}
    >
      {icon && <div className={cn('text-fg-subtle', sizing.icon)}>{icon}</div>}
      <h3 className={cn('text-fg', sizing.title)}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-small text-fg-muted">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg transition-colors hover:bg-surface-warm/40"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg transition-colors hover:bg-surface-warm/40"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
