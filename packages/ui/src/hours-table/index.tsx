import * as React from 'react';
import { cn } from '../lib/cn';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HoursRow {
  /** ISO day number, 0=Sunday … 6=Saturday — matches `OperatingHoursSchema.dayOfWeek`. */
  dayOfWeek: DayOfWeek;
  /** "HH:MM" 24h. */
  opensAt: string;
  /** "HH:MM" 24h. */
  closesAt: string;
  isClosed?: boolean;
}

export interface HoursTableProps {
  hours: HoursRow[];
  highlightToday?: boolean;
  /** 'list' = 7 explicit rows; 'compact' = grouped consecutive ranges (Mon–Fri 11–22). */
  layout?: 'list' | 'compact';
  className?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface GroupedRow {
  startDay: DayOfWeek;
  endDay: DayOfWeek;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

function groupConsecutive(hours: HoursRow[]): GroupedRow[] {
  if (hours.length === 0) return [];
  // Order by day, expecting 7 rows; gaps are allowed.
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const groups: GroupedRow[] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    const sameRange =
      last !== undefined &&
      last.isClosed === Boolean(row.isClosed) &&
      last.opensAt === row.opensAt &&
      last.closesAt === row.closesAt &&
      last.endDay + 1 === row.dayOfWeek;
    if (sameRange) {
      last.endDay = row.dayOfWeek;
    } else {
      groups.push({
        startDay: row.dayOfWeek,
        endDay: row.dayOfWeek,
        opensAt: row.opensAt,
        closesAt: row.closesAt,
        isClosed: Boolean(row.isClosed),
      });
    }
  }
  return groups;
}

export function HoursTable({
  hours,
  highlightToday = true,
  layout = 'list',
  className,
}: HoursTableProps) {
  const today = (new Date().getDay() as DayOfWeek);

  if (layout === 'compact') {
    const groups = groupConsecutive(hours);
    return (
      <div className={cn('flex flex-col gap-1 text-small', className)}>
        {groups.map((g, i) => (
          <div key={i} className="flex justify-between gap-4 tabular-nums">
            <span className="font-medium">
              {g.startDay === g.endDay
                ? DAY_LABELS[g.startDay]
                : `${DAY_LABELS[g.startDay]}–${DAY_LABELS[g.endDay]}`}
            </span>
            <span className="opacity-80">
              {g.isClosed ? 'Closed' : `${g.opensAt}–${g.closesAt}`}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className={cn('w-full text-small tabular-nums', className)}>
      <tbody>
        {hours.map((row) => {
          const isToday = highlightToday && row.dayOfWeek === today;
          return (
            <tr
              key={row.dayOfWeek}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'border-b border-border/[var(--border-alpha)] last:border-0',
                isToday && 'bg-surface-warm/40 font-semibold text-fg',
              )}
            >
              <th
                scope="row"
                className="px-2 py-2 text-left text-caption uppercase tracking-wider text-fg-muted"
              >
                {DAY_LABELS[row.dayOfWeek]}
              </th>
              <td className="px-2 py-2 text-right text-fg">
                {row.isClosed ? (
                  <span className="text-fg-subtle">Closed</span>
                ) : (
                  `${row.opensAt}–${row.closesAt}`
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
