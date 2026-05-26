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
  /** Translated day abbreviations, index 0=Sun … 6=Sat. Falls back to English when absent. */
  dayLabels?: string[];
  /** Translated "Closed" label. Falls back to English when absent. */
  closedLabel?: string;
  className?: string;
}

const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface GroupedRow {
  startDay: DayOfWeek;
  endDay: DayOfWeek;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

/**
 * Week starts on Monday (ISO / Polish convention): Mon, Tue, Wed, Thu, Fri,
 * Sat, Sun. Sundays sort to the end so a Mon→Sat group can still collapse.
 */
function mondayFirstIndex(day: DayOfWeek): number {
  return day === 0 ? 6 : day - 1;
}

function groupConsecutive(hours: HoursRow[]): GroupedRow[] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort(
    (a, b) => mondayFirstIndex(a.dayOfWeek) - mondayFirstIndex(b.dayOfWeek),
  );
  const groups: GroupedRow[] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    const sameRange =
      last !== undefined &&
      last.isClosed === Boolean(row.isClosed) &&
      last.opensAt === row.opensAt &&
      last.closesAt === row.closesAt &&
      mondayFirstIndex(last.endDay) + 1 === mondayFirstIndex(row.dayOfWeek);
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
  dayLabels,
  closedLabel = 'Closed',
  className,
}: HoursTableProps) {
  const today = (new Date().getDay() as DayOfWeek);
  const labels = dayLabels ?? DAY_LABELS_EN;

  if (layout === 'compact') {
    const groups = groupConsecutive(hours);
    return (
      <div className={cn('flex flex-col gap-1 text-small', className)}>
        {groups.map((g, i) => (
          <div key={i} className="flex justify-between gap-4 tabular-nums">
            <span className="font-medium">
              {g.startDay === g.endDay
                ? labels[g.startDay]
                : `${labels[g.startDay]}–${labels[g.endDay]}`}
            </span>
            <span className="opacity-80">
              {g.isClosed ? closedLabel : `${g.opensAt}–${g.closesAt}`}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const sortedHours = [...hours].sort(
    (a, b) => mondayFirstIndex(a.dayOfWeek) - mondayFirstIndex(b.dayOfWeek),
  );

  return (
    <table className={cn('w-full text-small tabular-nums', className)}>
      <tbody>
        {sortedHours.map((row) => {
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
                {labels[row.dayOfWeek]}
              </th>
              <td className="px-2 py-2 text-right text-fg">
                {row.isClosed ? (
                  <span className="text-fg-subtle">{closedLabel}</span>
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
