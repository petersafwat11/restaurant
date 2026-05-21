'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type ReservationCalendarStatus =
  | 'CONFIRMED'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface ReservationCalendarBlock {
  id: string;
  startAt: string; // ISO
  endAt: string; // ISO
  status: ReservationCalendarStatus;
  guestCount: number;
  contactName: string;
  tableId: string | null;
}

export interface ReservationCalendarTable {
  id: string;
  name: string;
  capacity: number;
}

export interface MoveTarget {
  startAt: string;
  tableId: string | null;
}

export interface ReservationCalendarProps {
  mode: 'day' | 'week' | 'month';
  date: Date; // Anchor date
  blocks: ReservationCalendarBlock[];
  tables: ReservationCalendarTable[];
  onBlockClick?: (id: string) => void;
  onMove?: (id: string, target: MoveTarget) => void;
  onDateChange?: (next: Date) => void;
  slotMinutes?: number;
  /** Hour range to display in Day/Week view, inclusive end. */
  dayStartHour?: number;
  dayEndHour?: number;
  className?: string;
}

const STATUS_TINT: Record<ReservationCalendarStatus, string> = {
  CONFIRMED: 'bg-info/20 border-info text-info',
  SEATED: 'bg-accent/20 border-accent text-accent',
  COMPLETED: 'bg-positive/20 border-positive text-positive',
  CANCELLED: 'bg-negative/15 border-negative text-negative line-through opacity-70',
  NO_SHOW: 'bg-warning/15 border-warning text-warning',
};

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function startOfWeek(d: Date): Date {
  // ISO week — Monday start.
  const c = startOfDay(d);
  const day = c.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + offset);
  return c;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function durationMin(startIso: string, endIso: string): number {
  return Math.max(15, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export function ReservationCalendar(props: ReservationCalendarProps) {
  const {
    mode,
    date,
    blocks,
    tables,
    onBlockClick,
    onMove,
    onDateChange,
    slotMinutes = 30,
    dayStartHour = 9,
    dayEndHour = 24,
    className,
  } = props;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <CalendarHeader mode={mode} date={date} onDateChange={onDateChange} />
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'day' && (
          <DayView
            date={date}
            blocks={blocks}
            tables={tables}
            onBlockClick={onBlockClick}
            onMove={onMove}
            slotMinutes={slotMinutes}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
          />
        )}
        {mode === 'week' && (
          <WeekView
            date={date}
            blocks={blocks}
            onBlockClick={onBlockClick}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
          />
        )}
        {mode === 'month' && (
          <MonthView date={date} blocks={blocks} onBlockClick={onBlockClick} />
        )}
      </div>
    </div>
  );
}

function CalendarHeader({
  mode,
  date,
  onDateChange,
}: {
  mode: 'day' | 'week' | 'month';
  date: Date;
  onDateChange?: (d: Date) => void;
}) {
  const label = (() => {
    if (mode === 'day') {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (mode === 'week') {
      const start = startOfWeek(date);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })();

  function step(n: number) {
    if (!onDateChange) return;
    if (mode === 'day') onDateChange(addDays(date, n));
    if (mode === 'week') onDateChange(addDays(date, 7 * n));
    if (mode === 'month') {
      const c = new Date(date);
      c.setMonth(c.getMonth() + n);
      onDateChange(c);
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-border/[var(--border-alpha)] px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous"
          className="grid h-8 w-8 place-items-center rounded-button text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDateChange?.(new Date())}
          className="rounded-button px-3 py-1 text-caption uppercase tracking-wider text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="grid h-8 w-8 place-items-center rounded-button text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <h3 className="text-h2 font-semibold tabular-nums text-fg">{label}</h3>
      <div className="w-[120px]" aria-hidden />
    </div>
  );
}

// ---- Day view ------------------------------------------------------------

const ROW_HEIGHT = 30; // px per 30-min slot

function DayView({
  date,
  blocks,
  tables,
  onBlockClick,
  onMove,
  slotMinutes,
  dayStartHour,
  dayEndHour,
}: {
  date: Date;
  blocks: ReservationCalendarBlock[];
  tables: ReservationCalendarTable[];
  onBlockClick?: (id: string) => void;
  onMove?: (id: string, target: MoveTarget) => void;
  slotMinutes: number;
  dayStartHour: number;
  dayEndHour: number;
}) {
  const slotsPerHour = 60 / slotMinutes;
  const hours = Array.from(
    { length: dayEndHour - dayStartHour },
    (_, i) => dayStartHour + i,
  );
  const rowsPerHour = slotsPerHour;
  const todayBlocks = blocks.filter((b) => sameDay(new Date(b.startAt), date));

  const [now, setNow] = React.useState<Date>(new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const isToday = sameDay(now, date);
  const minutesIntoDay = isToday
    ? (now.getHours() - dayStartHour) * 60 + now.getMinutes()
    : -1;

  function minutesToTop(min: number): number {
    return (min / slotMinutes) * ROW_HEIGHT;
  }

  function blockMetrics(b: ReservationCalendarBlock) {
    const start = new Date(b.startAt);
    const startMin = (start.getHours() - dayStartHour) * 60 + start.getMinutes();
    const dur = durationMin(b.startAt, b.endAt);
    return {
      top: minutesToTop(Math.max(0, startMin)),
      height: minutesToTop(Math.min(dur, (dayEndHour - dayStartHour) * 60 - startMin)),
    };
  }

  function handleDragEnd(
    b: ReservationCalendarBlock,
    e: React.PointerEvent<HTMLButtonElement>,
    laneEl: HTMLElement,
  ) {
    if (!onMove) return;
    const lanes = Array.from(
      (laneEl.parentElement as HTMLElement).children,
    ) as HTMLElement[];
    const rect = laneEl.getBoundingClientRect();
    const drop = { x: e.clientX, y: e.clientY };
    const targetLane = lanes.find((el) => {
      const r = el.getBoundingClientRect();
      return drop.x >= r.left && drop.x <= r.right;
    });
    if (!targetLane) return;
    const targetTableId = targetLane.dataset.tableId ?? null;
    const yRel = drop.y - rect.top;
    const minutes = Math.max(0, Math.round((yRel / ROW_HEIGHT) * slotMinutes));
    const snapped = Math.round(minutes / slotMinutes) * slotMinutes;
    const newStart = new Date(date);
    newStart.setHours(dayStartHour, 0, 0, 0);
    newStart.setMinutes(snapped);
    if (newStart.toISOString() === b.startAt && targetTableId === b.tableId) return;
    onMove(b.id, { startAt: newStart.toISOString(), tableId: targetTableId });
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="sticky left-0 z-10 flex w-16 shrink-0 flex-col border-r border-border/[var(--border-alpha)] bg-surface text-caption uppercase tracking-wider text-fg-subtle">
        <div className="h-10 border-b border-border/[var(--border-alpha)]" />
        {hours.map((h) => (
          <div
            key={h}
            className="border-b border-border/[var(--border-alpha)] px-2 py-1 tabular-nums"
            style={{ height: ROW_HEIGHT * rowsPerHour }}
          >
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1">
        {tables.length === 0 ? (
          <div className="grid w-full place-items-center text-small text-fg-muted">
            No tables configured.
          </div>
        ) : (
          tables.map((t) => (
            <div
              key={t.id}
              data-table-id={t.id}
              className="relative flex-1 border-r border-border/[var(--border-alpha)] last:border-r-0"
              style={{ minWidth: 140 }}
            >
              <header className="sticky top-0 z-10 h-10 border-b border-border/[var(--border-alpha)] bg-surface px-3 py-2 text-small">
                <div className="font-medium text-fg">{t.name}</div>
                <div className="text-caption uppercase tracking-wider text-fg-subtle">
                  Cap {t.capacity}
                </div>
              </header>
              <div
                className="relative"
                style={{ height: ROW_HEIGHT * rowsPerHour * hours.length }}
              >
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className={cn(
                      'border-b border-border/[var(--border-alpha)]',
                      i % 2 === 1 && 'bg-surface-2/30',
                    )}
                    style={{ height: ROW_HEIGHT * rowsPerHour }}
                  />
                ))}
                {todayBlocks
                  .filter((b) => b.tableId === t.id)
                  .map((b) => {
                    const { top, height } = blockMetrics(b);
                    return (
                      <DraggableBlock
                        key={b.id}
                        block={b}
                        top={top}
                        height={height}
                        onClick={() => onBlockClick?.(b.id)}
                        onDragEnd={
                          onMove
                            ? (e, laneEl) => handleDragEnd(b, e, laneEl)
                            : undefined
                        }
                      />
                    );
                  })}
              </div>
            </div>
          ))
        )}
        {isToday && minutesIntoDay >= 0 && minutesIntoDay <= (dayEndHour - dayStartHour) * 60 && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-16 right-0 h-px bg-accent"
            style={{ top: 40 + minutesToTop(minutesIntoDay) }}
          />
        )}
      </div>
    </div>
  );
}

function DraggableBlock({
  block,
  top,
  height,
  onClick,
  onDragEnd,
}: {
  block: ReservationCalendarBlock;
  top: number;
  height: number;
  onClick?: () => void;
  onDragEnd?: (
    e: React.PointerEvent<HTMLButtonElement>,
    laneEl: HTMLElement,
  ) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [drag, setDrag] = React.useState<{ dx: number; dy: number } | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!onDragEnd) return;
    if (e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging || !startPosRef.current) return;
    setDrag({
      dx: e.clientX - startPosRef.current.x,
      dy: e.clientY - startPosRef.current.y,
    });
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setDragging(false);
    const moved = drag && (Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4);
    setDrag(null);
    if (moved && onDragEnd && buttonRef.current) {
      const lane = buttonRef.current.closest('[data-table-id]') as HTMLElement | null;
      if (lane) onDragEnd(e, lane);
    } else {
      onClick?.();
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        'absolute left-1 right-1 z-10 overflow-hidden rounded-button border px-2 py-1 text-left text-small transition-shadow',
        STATUS_TINT[block.status],
        dragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:shadow-md',
      )}
      style={{
        top,
        height: Math.max(height, 24),
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
        touchAction: 'none',
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{block.contactName}</span>
        <span className="tabular-nums text-caption uppercase tracking-wider opacity-80">
          {block.guestCount}p
        </span>
      </div>
      <div className="tabular-nums text-caption opacity-80">
        {fmtTime(block.startAt)} – {fmtTime(block.endAt)}
      </div>
    </button>
  );
}

// ---- Week view -----------------------------------------------------------

function WeekView({
  date,
  blocks,
  onBlockClick,
  dayStartHour,
  dayEndHour,
}: {
  date: Date;
  blocks: ReservationCalendarBlock[];
  onBlockClick?: (id: string) => void;
  dayStartHour: number;
  dayEndHour: number;
}) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from(
    { length: dayEndHour - dayStartHour },
    (_, i) => dayStartHour + i,
  );

  function topFor(b: ReservationCalendarBlock): number {
    const d = new Date(b.startAt);
    const min = (d.getHours() - dayStartHour) * 60 + d.getMinutes();
    return (min / 60) * 48; // 48px per hour in week
  }

  return (
    <div className="flex min-w-[700px]">
      <div className="sticky left-0 z-10 flex w-14 shrink-0 flex-col bg-surface text-caption uppercase tracking-wider text-fg-subtle">
        <div className="h-10 border-b border-border/[var(--border-alpha)]" />
        {hours.map((h) => (
          <div
            key={h}
            className="border-b border-border/[var(--border-alpha)] px-2 py-1 tabular-nums"
            style={{ height: 48 }}
          >
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>
      {days.map((d) => {
        const dayBlocks = blocks.filter((b) => sameDay(new Date(b.startAt), d));
        return (
          <div
            key={d.toISOString()}
            className="relative flex-1 border-l border-border/[var(--border-alpha)]"
          >
            <header className={`sticky top-0 z-10 h-10 border-b border-border/[var(--border-alpha)] bg-surface px-2 py-2 text-small ${sameDay(d, new Date()) ? 'text-accent' : 'text-fg-muted'}`}>
              <div className="text-caption uppercase tracking-wider">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div className="tabular-nums text-fg">{d.getDate()}</div>
            </header>
            <div className="relative" style={{ height: 48 * hours.length }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-border/[var(--border-alpha)]"
                  style={{ height: 48 }}
                />
              ))}
              {dayBlocks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBlockClick?.(b.id)}
                  className={cn(
                    'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-button border px-1.5 py-0.5 text-left text-caption uppercase tracking-wider',
                    STATUS_TINT[b.status],
                  )}
                  style={{
                    top: topFor(b),
                    height: Math.max(20, (durationMin(b.startAt, b.endAt) / 60) * 48),
                  }}
                >
                  <span className="tabular-nums">{fmtTime(b.startAt)}</span>{' '}
                  {b.contactName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Month view ----------------------------------------------------------

function MonthView({
  date,
  blocks,
  onBlockClick,
}: {
  date: Date;
  blocks: ReservationCalendarBlock[];
  onBlockClick?: (id: string) => void;
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const gridStart = addDays(first, -startDay);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-7 border-l border-t border-border/[var(--border-alpha)]">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div
          key={d}
          className="border-b border-r border-border/[var(--border-alpha)] bg-surface-2/30 px-2 py-1 text-caption uppercase tracking-wider text-fg-subtle"
        >
          {d}
        </div>
      ))}
      {cells.map((c) => {
        const dayBlocks = blocks.filter((b) => sameDay(new Date(b.startAt), c));
        const inMonth = c.getMonth() === date.getMonth();
        return (
          <div
            key={c.toISOString()}
            className={cn(
              'min-h-[90px] border-b border-r border-border/[var(--border-alpha)] p-1.5 text-small',
              !inMonth && 'bg-surface-2/20 text-fg-tertiary',
            )}
          >
            <div
              className={cn(
                'mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-caption tabular-nums',
                sameDay(c, today) ? 'bg-accent text-bg font-semibold' : 'text-fg-muted',
              )}
            >
              {c.getDate()}
            </div>
            <div className="space-y-0.5">
              {dayBlocks.slice(0, 3).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBlockClick?.(b.id)}
                  className={cn(
                    'block w-full truncate rounded px-1 text-left text-caption',
                    STATUS_TINT[b.status],
                  )}
                >
                  <span className="tabular-nums">{fmtTime(b.startAt)}</span>{' '}
                  {b.contactName.split(' ')[0]}
                </button>
              ))}
              {dayBlocks.length > 3 && (
                <span className="text-caption uppercase tracking-wider text-fg-subtle">
                  +{dayBlocks.length - 3} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
