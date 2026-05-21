'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface RelativeTimeProps extends Omit<React.HTMLAttributes<HTMLTimeElement>, 'children'> {
  value: Date | string | number;
  /** How often to re-render. 'sec' for sub-minute ages, 'min' for everything else. */
  tick?: 'sec' | 'min' | 'none';
  /** Locale for the absolute-time tooltip. */
  locale?: string;
  /** Optional override of the visible label (e.g. for SSR-stable initial paint). */
  prefix?: string;
}

function toDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v);
}

function formatRelative(ms: number): string {
  const abs = Math.abs(ms);
  const sec = Math.round(abs / 1000);
  if (sec < 5) return ms < 0 ? 'in a few seconds' : 'just now';
  if (sec < 60) return `${ms < 0 ? 'in ' : ''}${sec}s${ms < 0 ? '' : ' ago'}`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${ms < 0 ? 'in ' : ''}${min}m${ms < 0 ? '' : ' ago'}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${ms < 0 ? 'in ' : ''}${hr}h${ms < 0 ? '' : ' ago'}`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${ms < 0 ? 'in ' : ''}${day}d${ms < 0 ? '' : ' ago'}`;
  const month = Math.round(day / 30);
  if (month < 12) return `${ms < 0 ? 'in ' : ''}${month}mo${ms < 0 ? '' : ' ago'}`;
  const yr = Math.round(month / 12);
  return `${ms < 0 ? 'in ' : ''}${yr}y${ms < 0 ? '' : ' ago'}`;
}

/**
 * Self-updating relative-time label. Used in every list page (Orders ELAPSED,
 * Customers lastOrderAt, Reviews, Audit log, …). Renders as a `<time>` element
 * with the absolute ISO timestamp as `title` (tooltip on hover) and `dateTime`.
 */
export function RelativeTime({
  value,
  tick = 'min',
  locale,
  prefix,
  className,
  ...rest
}: RelativeTimeProps) {
  const date = React.useMemo(() => toDate(value), [value]);
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    if (tick === 'none') return;
    const interval = tick === 'sec' ? 1000 : 30_000;
    const id = setInterval(force, interval);
    return () => clearInterval(id);
  }, [tick]);

  const ms = Date.now() - date.getTime();
  const label = formatRelative(ms);
  const absolute = date.toLocaleString(locale);

  return (
    <time
      dateTime={date.toISOString()}
      title={absolute}
      className={cn('tabular-nums', className)}
      {...rest}
    >
      {prefix}
      {label}
    </time>
  );
}
