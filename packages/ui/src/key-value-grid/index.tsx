import * as React from 'react';
import { cn } from '../lib/cn';

export interface KeyValueRow {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export interface KeyValueGridProps {
  rows: KeyValueRow[];
  columns?: 1 | 2;
  dense?: boolean;
  className?: string;
}

export function KeyValueGrid({
  rows,
  columns = 2,
  dense = false,
  className,
}: KeyValueGridProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3',
        columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        dense && 'gap-y-2',
        className,
      )}
    >
      {rows.map((row, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-caption uppercase tracking-wider text-fg-subtle">
            {row.label}
          </dt>
          <dd className="mt-1 truncate text-body text-fg tabular-nums">{row.value}</dd>
          {row.hint && (
            <p className="mt-1 text-small text-fg-muted">{row.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}
