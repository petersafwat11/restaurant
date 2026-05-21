'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { RelativeTime } from '../relative-time';

export interface TimelineEntry {
  id: string;
  /** Headline of this entry — e.g. "Order confirmed", "Staff note added". */
  title: React.ReactNode;
  at: Date | string | number;
  /** Optional sub-line: actor + role. */
  actor?: string;
  actorRole?: string;
  /** Long-form note shown below the metadata. */
  note?: React.ReactNode;
  /** Tailwind class for the dot color — typically a status token. */
  dotClassName?: string;
  /** Highlight the entry with an accent ring (e.g. current order status). */
  current?: boolean;
}

export interface ActivityTimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

/**
 * Vertical timeline for orders, reservations, audit log expansion. Dots are
 * connected by a hairline rail; the `current` entry gets a glow ring to call
 * out where the entity sits right now.
 */
export function ActivityTimeline({ entries, className }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return <div className={cn('text-sm text-fg-subtle', className)}>No activity yet.</div>;
  }
  return (
    <ol className={cn('relative flex flex-col gap-4', className)}>
      {entries.map((e, i) => {
        const isLast = i === entries.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3">
            {/* rail */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[5px] top-3 bottom-[-1rem] w-px bg-border/[var(--border-strong-alpha)]"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-[1] mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                e.dotClassName ?? 'bg-fg-subtle',
                e.current && 'ring-4 ring-accent/30',
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-fg">{e.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-subtle">
                <RelativeTime value={e.at} />
                {e.actor && (
                  <>
                    <span>·</span>
                    <span className="text-fg-muted">{e.actor}</span>
                    {e.actorRole && (
                      <span className="text-fg-subtle">({e.actorRole})</span>
                    )}
                  </>
                )}
              </div>
              {e.note && <div className="mt-1 text-sm text-fg-muted">{e.note}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
