'use client';

import { Plus, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export const SCHEDULE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export interface ScheduleWindow {
  from: string; // HH:MM
  to: string; // HH:MM
}

export interface WeeklySchedule {
  days: ScheduleDay[];
  windows: ScheduleWindow[];
}

export interface SchedulePickerProps {
  value: WeeklySchedule;
  onChange: (next: WeeklySchedule) => void;
  helper?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Day + time-window picker for item availability, operating hours, promotion
 * windows, and holidays. The shape (`{ days[], windows[] }`) maps directly
 * to the `WeeklySchedule` type. Mirrored in @repo/types as well.
 */
export function SchedulePicker({
  value,
  onChange,
  helper,
  disabled,
  className,
}: SchedulePickerProps) {
  const days = value.days ?? [];
  const windows = value.windows.length > 0 ? value.windows : [{ from: '11:00', to: '14:00' }];

  function setDays(next: ScheduleDay[]) {
    onChange({ days: next, windows });
  }
  function setWindows(next: ScheduleWindow[]) {
    onChange({ days, windows: next });
  }
  function toggleDay(d: ScheduleDay) {
    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  }
  function addWindow() {
    setWindows([...windows, { from: '17:00', to: '21:00' }]);
  }
  function updateWindow(i: number, patch: Partial<ScheduleWindow>) {
    setWindows(windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }
  function removeWindow(i: number) {
    setWindows(windows.filter((_, idx) => idx !== i));
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-1" role="group" aria-label="Days of week">
        {SCHEDULE_DAYS.map((d) => {
          const on = days.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggleDay(d)}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                on
                  ? 'border-accent bg-accent text-bg'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:text-fg',
              )}
            >
              {d.charAt(0)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {windows.map((w, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: windows are positional
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              value={w.from}
              disabled={disabled}
              onChange={(e) => updateWindow(i, { from: e.target.value })}
              className="h-8 w-28 rounded-md border-hairline-strong bg-surface px-2 text-xs tabular-nums text-fg outline-none focus:border-accent"
            />
            <span className="text-fg-subtle">–</span>
            <input
              type="time"
              value={w.to}
              disabled={disabled}
              onChange={(e) => updateWindow(i, { to: e.target.value })}
              className="h-8 w-28 rounded-md border-hairline-strong bg-surface px-2 text-xs tabular-nums text-fg outline-none focus:border-accent"
            />
            {windows.length > 1 && (
              <button
                type="button"
                onClick={() => removeWindow(i)}
                aria-label="Remove time window"
                className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addWindow}
          disabled={disabled}
          className="inline-flex h-7 items-center gap-1 self-start rounded-md px-2 text-xs text-accent transition-colors hover:bg-accent/[0.08]"
        >
          <Plus size={12} /> Add window
        </button>
      </div>

      {helper && <div className="text-xs text-fg-subtle">{helper}</div>}
    </div>
  );
}
