'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../_shadcn/popover';
import { cn } from '../lib/cn';

export type { DateRange };

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  presets?: Array<{
    id: string;
    label: string;
    get: () => DateRange;
  }>;
  placeholder?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  disabled?: boolean;
  /** Localizable footer-action labels. */
  labels?: {
    /** Label for the clear button. Defaults to "Clear". */
    clear?: React.ReactNode;
    /** Label for the apply button. Defaults to "Apply". */
    apply?: React.ReactNode;
  };
}

function fmt(d: Date | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DateRangePicker({
  value,
  onChange,
  presets,
  placeholder = 'Select dates',
  align = 'start',
  className,
  disabled,
  labels,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { clear: clearLabel = 'Clear', apply: applyLabel = 'Apply' } = labels ?? {};

  const display = (() => {
    if (!value?.from) return placeholder;
    if (!value.to) return fmt(value.from);
    return `${fmt(value.from)} – ${fmt(value.to)}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-small text-fg transition-colors',
            'hover:bg-surface-warm/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            disabled && 'cursor-not-allowed opacity-50',
            !value?.from && 'text-fg-muted',
            className,
          )}
          aria-label={display}
        >
          <CalendarIcon className="h-4 w-4 text-fg-subtle" />
          <span>{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto border border-border/[var(--border-alpha)] bg-surface-2 p-0"
      >
        <div className="flex">
          {presets && presets.length > 0 && (
            <div className="flex w-40 shrink-0 flex-col gap-0.5 border-r border-border/[var(--border-alpha)] p-3">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange?.(p.get());
                  }}
                  className="rounded-button px-3 py-1.5 text-left text-small text-fg-muted transition-colors hover:bg-surface-warm/30 hover:text-fg"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="p-3">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              selected={value}
              onSelect={onChange}
              showOutsideDays
              className="rdp-admin"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/[var(--border-alpha)] px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onChange?.(undefined);
            }}
            className="text-small text-fg-muted hover:text-fg"
          >
            {clearLabel}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-button bg-accent px-3 py-1 text-small font-medium text-bg hover:bg-accent-hover"
          >
            {applyLabel}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
