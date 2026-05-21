'use client';

import { Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui';
import { Calendar } from 'lucide-react';
import * as React from 'react';

export type RangeId = 'today' | '7d' | '30d' | 'custom';

export interface DateRange {
  id: RangeId;
  from?: string;
  to?: string;
}

const SEGMENTS: { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

interface DateRangeSegmentedProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * Segmented date-range control used in the Topbar of analytics-aware pages
 * (Overview, Reports). Keyboard-nav with arrow keys. The "Custom" segment
 * opens a popover with from/to inputs.
 */
export function DateRangeSegmented({ value, onChange }: DateRangeSegmentedProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [customOpen, setCustomOpen] = React.useState(false);

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (i + dir + SEGMENTS.length) % SEGMENTS.length;
    refs.current[next]?.focus();
    const seg = SEGMENTS[next];
    if (seg && seg.id !== 'custom') onChange({ id: seg.id });
  }

  return (
    <div className="relative flex h-8 items-center gap-0.5 rounded-md border-hairline-strong bg-surface p-0.5">
      {SEGMENTS.map((seg, i) => {
        const isActive = value.id === seg.id;
        return (
          <Popover
            key={seg.id}
            open={seg.id === 'custom' && customOpen}
            onOpenChange={(o) => seg.id === 'custom' && setCustomOpen(o)}
          >
            <PopoverTrigger asChild>
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-pressed={isActive}
                onClick={() => {
                  if (seg.id === 'custom') setCustomOpen((o) => !o);
                  else onChange({ id: seg.id });
                }}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  'flex h-7 items-center gap-1 rounded-sm px-2 text-xs transition-colors',
                  isActive ? 'bg-surface-2 text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                )}
              >
                {seg.id === 'custom' && <Calendar size={12} />}
                {seg.label}
              </button>
            </PopoverTrigger>
            {seg.id === 'custom' && (
              <PopoverContent align="end" className="w-72 p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-fg-subtle">
                  Custom range
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    defaultValue={value.from}
                    onChange={(e) => onChange({ id: 'custom', from: e.target.value, to: value.to })}
                    className="flex-1 rounded-md border-hairline-strong bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:border-accent"
                  />
                  <input
                    type="date"
                    defaultValue={value.to}
                    onChange={(e) =>
                      onChange({ id: 'custom', from: value.from, to: e.target.value })
                    }
                    className="flex-1 rounded-md border-hairline-strong bg-surface px-2 py-1.5 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="mt-3 w-full rounded-md py-1.5 text-center text-xs text-accent hover:bg-accent/10"
                >
                  Apply
                </button>
              </PopoverContent>
            )}
          </Popover>
        );
      })}
    </div>
  );
}
