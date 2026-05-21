'use client';

import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '../_shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../_shadcn/dropdown-menu';
import { cn } from '../lib/cn';
import { SearchInput } from '../search-input';

export type ExportFormat = 'csv' | 'pdf';

export interface TableToolbarProps {
  /** Optional debounced search. Omit to hide the input. */
  search?: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    debounceMs?: number;
  };
  /** Arbitrary filter UI rendered between search and exports. */
  filters?: React.ReactNode;
  /** Click handler for either CSV or PDF. Omit to hide the export button. */
  onExport?: (format: ExportFormat) => void;
  /** Disables the export button (e.g. zero rows). */
  exportDisabled?: boolean;
  /** Shows a spinner inside the export button. */
  exportPending?: boolean;
  className?: string;
}

/**
 * Toolbar primitive used above DataTable instances. Composes a debounced
 * search input, an arbitrary filter slot, and an export dropdown (CSV / PDF).
 * Presentational only — owns no business logic.
 */
export function TableToolbar({
  search,
  filters,
  onExport,
  exportDisabled,
  exportPending,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        className,
      )}
    >
      {search && (
        <SearchInput
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder ?? 'Search…'}
          debounceMs={search.debounceMs ?? 300}
          size="sm"
          className="min-w-[240px] max-w-[360px] flex-1"
        />
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      <div className="ml-auto flex items-center gap-2">
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exportDisabled || exportPending}
                aria-label="Export table"
              >
                {exportPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Export
                <ChevronDown size={12} className="opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('csv')}>
                <FileSpreadsheet size={14} /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                <FileText size={14} /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
