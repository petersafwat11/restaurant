import * as React from 'react';
import { cn } from '../lib/cn';

export interface SettingsSectionCardProps {
  id?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES = {
  default: 'border-border/[var(--border-alpha)] bg-surface',
  danger:
    'border-negative/40 bg-surface ring-1 ring-inset ring-negative/10',
} as const;

export function SettingsSectionCard({
  id,
  title,
  description,
  action,
  tone = 'default',
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        'rounded-card border p-6',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            id={id ? `${id}-title` : undefined}
            className={cn(
              'text-h2 font-semibold',
              tone === 'danger' ? 'text-negative' : 'text-fg',
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-small text-fg-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
