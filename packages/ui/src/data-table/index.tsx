'use client';

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { Checkbox } from '../_shadcn/checkbox';
import { cn } from '../lib/cn';
import { Pagination, type PaginationState } from './pagination';

export type { ColumnDef } from '@tanstack/react-table';

export interface DataTableSelectionState<TKey extends string = string> {
  selected: Set<TKey>;
  onChange: (next: Set<TKey>) => void;
}

export interface DataTableSortState {
  id: string;
  dir: 'asc' | 'desc';
}

export interface DataTableRowDecorator {
  /** "live-new" highlight — adds the row-arrive + accent-pulse animation. */
  isNew?: boolean;
  /** Inset border color (Tailwind class). Use a status token like `shadow-[inset_2px_0_0_rgb(var(--status-cancelled))]`. */
  borderInsetClass?: string;
  /** Dim non-actionable rows (e.g. cancelled). */
  dim?: boolean;
}

export interface DataTableProps<T, TKey extends string = string> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => TKey;
  loading?: boolean;
  /** Skeleton rows shown while `loading` is true. */
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  errorState?: {
    title?: React.ReactNode;
    message: React.ReactNode;
    onRetry?: () => void;
  };
  onRowClick?: (row: T) => void;
  selection?: DataTableSelectionState<TKey>;
  sort?: {
    state: DataTableSortState | null;
    onChange: (next: DataTableSortState | null) => void;
  };
  pagination?: PaginationState;
  rowDecorator?: (row: T) => DataTableRowDecorator | undefined;
  focusedKey?: TKey;
  onFocusChange?: (key: TKey) => void;
  stickyHeader?: boolean;
  className?: string;
}

/**
 * Generic table primitive built on TanStack Table v8. Public surface stays
 * close to the Claude Design API (data + columns + rowKey + selection +
 * pagination + sort + rowDecorator) — TanStack is implementation detail.
 *
 * Selection uses a `Set<TKey>` for O(1) toggle on big lists. Pagination is
 * external (parent owns pageIndex/pageSize) so server-side pagination is the
 * default — no client-side slicing.
 */
export function DataTable<T, TKey extends string = string>({
  data,
  columns,
  rowKey,
  loading,
  skeletonRows = 8,
  emptyState,
  errorState,
  onRowClick,
  selection,
  sort,
  pagination,
  rowDecorator,
  focusedKey,
  onFocusChange,
  stickyHeader = true,
  className,
}: DataTableProps<T, TKey>) {
  const sortingState: SortingState = React.useMemo(
    () => (sort?.state ? [{ id: sort.state.id, desc: sort.state.dir === 'desc' }] : []),
    [sort?.state],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting: sortingState },
    manualSorting: true,
    manualPagination: true,
    onSortingChange: (updater) => {
      if (!sort) return;
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      const first = next[0];
      sort.onChange(first ? { id: first.id, dir: first.desc ? 'desc' : 'asc' } : null);
    },
    getRowId: (row) => rowKey(row),
  });

  const rowKeys = React.useMemo(() => data.map(rowKey), [data, rowKey]);
  const allSelected =
    !!selection && rowKeys.length > 0 && rowKeys.every((k) => selection.selected.has(k));
  const someSelected =
    !!selection &&
    !allSelected &&
    rowKeys.some((k) => selection.selected.has(k));

  function toggleAll() {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (allSelected) rowKeys.forEach((k) => next.delete(k));
    else rowKeys.forEach((k) => next.add(k));
    selection.onChange(next);
  }

  function toggleRow(k: TKey) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    selection.onChange(next);
  }

  if (errorState) {
    return (
      <div className={cn('rounded-md border-hairline bg-surface p-8 text-center', className)}>
        <div className="text-h2-admin text-fg">{errorState.title ?? "Couldn't load"}</div>
        <div className="mt-1 text-sm text-fg-muted">{errorState.message}</div>
        {errorState.onRetry && (
          <button
            type="button"
            onClick={errorState.onRetry}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-surface-2 px-4 text-sm text-fg transition-colors hover:bg-surface"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-md border-hairline bg-surface',
        className,
      )}
    >
      <div className="relative overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead
            className={cn(
              stickyHeader && 'sticky top-0 z-[1] bg-surface',
              'text-left text-caption-admin text-fg-subtle',
            )}
          >
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {selection && (
                  <th className="w-8 border-b-hairline px-3 py-2">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sortedDir = h.column.getIsSorted();
                  const align = (h.column.columnDef.meta as { align?: 'right' } | undefined)?.align;
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() === 150 ? undefined : h.getSize() }}
                      className={cn(
                        'border-b-hairline px-3 py-2 font-medium',
                        align === 'right' && 'text-right',
                        canSort && 'cursor-pointer select-none',
                      )}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort &&
                          (sortedDir === 'asc' ? (
                            <ChevronUp size={10} />
                          ) : sortedDir === 'desc' ? (
                            <ChevronDown size={10} />
                          ) : (
                            <ChevronsUpDown size={10} className="opacity-40" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="text-fg">
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                  <tr key={i} className="animate-pulse">
                    {selection && (
                      <td className="border-b-hairline px-3 py-3">
                        <div className="h-4 w-4 rounded bg-surface-2" />
                      </td>
                    )}
                    {columns.map((c, ci) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells
                      <td key={ci} className="border-b-hairline px-3 py-3">
                        <div className="h-3 w-3/5 rounded bg-surface-2" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.length === 0
                ? null
                : table.getRowModel().rows.map((row) => {
                    const k = rowKey(row.original) as TKey;
                    const dec = rowDecorator?.(row.original);
                    const isSelected = selection?.selected.has(k) ?? false;
                    const isFocused = focusedKey === k;
                    return (
                      <tr
                        key={row.id}
                        data-row-key={k}
                        tabIndex={0}
                        onClick={() => onRowClick?.(row.original)}
                        onFocus={() => onFocusChange?.(k)}
                        className={cn(
                          'group cursor-pointer transition-colors',
                          'hover:bg-surface-2',
                          isSelected && 'bg-accent/[0.06]',
                          isFocused && 'bg-surface-2',
                          dec?.dim && 'opacity-60',
                          dec?.isNew && 'animate-row-arrive',
                          dec?.borderInsetClass,
                        )}
                      >
                        {selection && (
                          <td
                            className="w-8 border-b-hairline px-3 py-2.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(k);
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(k)}
                              aria-label="Select row"
                            />
                          </td>
                        )}
                        {row.getVisibleCells().map((cell) => {
                          const align = (cell.column.columnDef.meta as
                            | { align?: 'right' }
                            | undefined)?.align;
                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                'border-b-hairline px-3 py-2.5',
                                align === 'right' && 'text-right tabular-nums',
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
          </tbody>
        </table>
        {!loading && data.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-fg-subtle">
            {emptyState ?? 'No results.'}
          </div>
        )}
      </div>
      {pagination && data.length > 0 && <Pagination {...pagination} />}
    </div>
  );
}
