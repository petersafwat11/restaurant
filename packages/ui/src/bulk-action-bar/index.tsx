'use client';

import type { LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface BulkAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  tone?: 'default' | 'destructive';
  disabled?: boolean;
  tooltip?: string;
  onClick: () => void;
}

export interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  actions: BulkAction[];
  /** Right-aligned trailing label, e.g. "$1,247.32 selected". */
  meta?: React.ReactNode;
  className?: string;
  /** Render the selection-count label. Defaults to `${count} selected`. */
  formatSelected?: (count: number) => React.ReactNode;
  /** Label for the clear button. Defaults to "Clear". */
  clearLabel?: React.ReactNode;
  /** Aria-label for the region. Defaults to "Bulk actions". */
  regionLabel?: string;
}

/**
 * Sticky bar that appears when a selection becomes non-empty in any list
 * page. Returns null when `count === 0` so callers don't need to gate.
 */
export function BulkActionBar({
  count,
  onClear,
  actions,
  meta,
  className,
  formatSelected,
  clearLabel = 'Clear',
  regionLabel = 'Bulk actions',
}: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label={regionLabel}
      className={cn(
        'flex h-11 items-center gap-4 rounded-md border-hairline-strong bg-surface-2 px-3',
        'animate-row-arrive',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium tabular-nums text-fg">
          {formatSelected ? formatSelected(count) : `${count} selected`}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-accent transition-opacity hover:opacity-80"
        >
          {clearLabel}
        </button>
      </div>

      <div className="flex flex-1 items-center gap-1">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              title={a.tooltip}
              disabled={a.disabled}
              onClick={a.onClick}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                a.tone === 'destructive'
                  ? 'text-negative hover:bg-negative/15'
                  : 'text-fg-muted hover:bg-surface hover:text-fg',
              )}
            >
              {Icon && <Icon size={13} />}
              {a.label}
            </button>
          );
        })}
      </div>

      {meta && (
        <div className="text-xs tabular-nums text-fg-subtle">{meta}</div>
      )}
    </div>
  );
}
