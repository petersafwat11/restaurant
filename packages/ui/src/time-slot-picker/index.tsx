'use client';

import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type TimeSlotValue =
  | { kind: 'asap' }
  | { kind: 'scheduled'; iso: string };

export interface TimeSlotPickerProps {
  value: TimeSlotValue;
  onChange: (next: TimeSlotValue) => void;
  mode: 'delivery' | 'pickup';
  earliestSlotMinutes: number;
  slotDurationMinutes?: number;
  slotsAheadHours?: number;
  /** When present, replaces the slot grid with a banner (e.g. "We're closed right now"). */
  closedReason?: string;
  className?: string;
}

interface Slot {
  iso: string;
  label: string;
  disabled?: boolean;
}

function buildSlots(
  earliestMinutes: number,
  durationMinutes: number,
  aheadHours: number,
  mode: 'delivery' | 'pickup',
): Slot[] {
  const now = new Date();
  const earliest = new Date(now.getTime() + earliestMinutes * 60_000);
  // Round up to the next slot boundary.
  const m = earliest.getMinutes();
  const rounded = new Date(earliest);
  const add = (durationMinutes - (m % durationMinutes)) % durationMinutes;
  rounded.setMinutes(m + add, 0, 0);
  const slots: Slot[] = [];
  const end = new Date(rounded.getTime() + aheadHours * 60 * 60_000);
  for (let t = new Date(rounded); t < end; t = new Date(t.getTime() + durationMinutes * 60_000)) {
    const h = t.getHours();
    const mm = t.getMinutes();
    // Naive cutoff: delivery stops at 22:00 (matches the SD landing hours mock).
    const disabled = mode === 'delivery' && (h >= 22 || (h === 21 && mm > 30));
    slots.push({
      iso: t.toISOString(),
      label: `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      disabled,
    });
  }
  return slots;
}

export function TimeSlotPicker({
  value,
  onChange,
  mode,
  earliestSlotMinutes,
  slotDurationMinutes = 15,
  slotsAheadHours = 3,
  closedReason,
  className,
}: TimeSlotPickerProps) {
  const slots = React.useMemo(
    () => buildSlots(earliestSlotMinutes, slotDurationMinutes, slotsAheadHours, mode),
    [earliestSlotMinutes, slotDurationMinutes, slotsAheadHours, mode],
  );

  if (closedReason) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-card border border-warning/20 bg-warning/10 px-4 py-3 text-small text-fg',
          className,
        )}
      >
        <AlertCircle size={18} className="text-warning" />
        <span>{closedReason}</span>
      </div>
    );
  }

  const isAsap = value.kind === 'asap';
  const asapSubLabel =
    mode === 'delivery'
      ? `${earliestSlotMinutes}–${earliestSlotMinutes + 20} min`
      : `${earliestSlotMinutes}–${earliestSlotMinutes + 5} min`;

  return (
    <div className={cn('flex flex-col gap-3', className)} role="radiogroup" aria-label={`${mode} time`}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={isAsap}
          onClick={() => onChange({ kind: 'asap' })}
          className={cn(
            'flex flex-col items-start rounded-card border px-4 py-3 transition-colors',
            isAsap
              ? 'border-accent bg-accent/[0.06]'
              : 'border-border/[var(--border-strong-alpha)] bg-surface-2 hover:border-accent/40',
          )}
        >
          <span className="text-body font-semibold text-fg">ASAP</span>
          <span className="text-small text-fg-muted">{asapSubLabel}</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isAsap}
          onClick={() =>
            onChange(
              slots[0]
                ? { kind: 'scheduled', iso: slots[0].iso }
                : { kind: 'asap' },
            )
          }
          className={cn(
            'flex flex-col items-start rounded-card border px-4 py-3 transition-colors',
            !isAsap
              ? 'border-accent bg-accent/[0.06]'
              : 'border-border/[var(--border-strong-alpha)] bg-surface-2 hover:border-accent/40',
          )}
        >
          <span className="text-body font-semibold text-fg">Schedule</span>
          <span className="text-small text-fg-muted">Pick a later slot</span>
        </button>
      </div>
      {!isAsap && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => {
            const selected = value.kind === 'scheduled' && value.iso === s.iso;
            return (
              <button
                key={s.iso}
                type="button"
                disabled={s.disabled}
                onClick={() => onChange({ kind: 'scheduled', iso: s.iso })}
                className={cn(
                  'h-10 rounded-button border text-small font-medium tabular-nums transition-colors',
                  selected
                    ? 'border-accent bg-accent text-text-on-accent'
                    : 'border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg hover:border-accent/40',
                  s.disabled && 'cursor-not-allowed text-fg-disabled line-through',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
