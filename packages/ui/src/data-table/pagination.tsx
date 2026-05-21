'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange?: (next: number) => void;
  pageSizeOptions?: number[];
}

function pageWindow(current: number, last: number): number[] {
  if (last <= 6) return Array.from({ length: last + 1 }, (_, i) => i);
  const set = new Set([0, 1, current - 1, current, current + 1, last - 1, last]);
  return Array.from(set)
    .filter((p) => p >= 0 && p <= last)
    .sort((a, b) => a - b);
}

export function Pagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: PaginationState) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const last = pageCount - 1;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(total, (pageIndex + 1) * pageSize);
  const pages = pageWindow(pageIndex, last);

  return (
    <div className="flex items-center justify-between gap-3 border-t-hairline px-3 py-2 text-xs">
      <span className="tabular-nums text-fg-subtle">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <span className="text-fg-subtle">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border-hairline-strong bg-surface px-2 text-xs text-fg outline-none focus:border-accent"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </>
        )}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
            aria-label="Previous page"
            className="grid h-7 w-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={14} />
          </button>
          {pages.map((p, i) => {
            const prev = pages[i - 1];
            const gap = prev != null && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {gap && <span className="px-1 text-fg-subtle">…</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-xs tabular-nums transition-colors',
                    p === pageIndex
                      ? 'bg-accent/[0.12] text-accent'
                      : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {p + 1}
                </button>
              </React.Fragment>
            );
          })}
          <button
            type="button"
            disabled={pageIndex >= last}
            onClick={() => onPageChange(pageIndex + 1)}
            aria-label="Next page"
            className="grid h-7 w-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
