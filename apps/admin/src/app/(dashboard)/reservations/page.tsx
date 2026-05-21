'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { ReservationCreateDrawer } from '@/features/reservations/components/reservation-create-drawer';
import { useReservations, useTables } from '@/features/reservations/hooks';
import { getApiClient } from '@/lib/api-client';
import type { ReservationDto, RestaurantPublicDto, TableDto } from '@repo/types';
import {
  EmptyState,
  ReservationCalendar,
  type ReservationCalendarBlock,
  type ReservationCalendarStatus,
  type ReservationCalendarTable,
  Spinner,
} from '@repo/ui';
import { formatRestaurantDateTime } from '@repo/utils';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, LayoutGrid, ListTree, Plus } from 'lucide-react';
import * as React from 'react';

type View = 'day' | 'week' | 'month' | 'list';

const STATUS_TOKENS: Record<ReservationCalendarStatus, { label: string; bg: string; fg: string }> =
  {
    CONFIRMED: { label: 'Confirmed', bg: 'bg-info/15', fg: 'text-info' },
    SEATED: { label: 'Seated', bg: 'bg-accent/15', fg: 'text-accent' },
    COMPLETED: { label: 'Completed', bg: 'bg-positive/15', fg: 'text-positive' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-negative/15', fg: 'text-negative' },
    NO_SHOW: { label: 'No-show', bg: 'bg-warning/15', fg: 'text-warning' },
  };

function toBlock(r: ReservationDto): ReservationCalendarBlock {
  return {
    id: r.id,
    startAt: r.startAt,
    endAt: r.endAt,
    status: r.status.toUpperCase() as ReservationCalendarStatus,
    guestCount: r.guestCount,
    contactName: r.contactName,
    tableId: r.tableId,
  };
}

function toCalTable(t: { id: string; name: string; capacity: number }): ReservationCalendarTable {
  return { id: t.id, name: t.name, capacity: t.capacity };
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function rangeForView(view: View, anchor: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === 'week') {
    const start = startOfDay(anchor);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = endOfDay(new Date(start));
    end.setDate(end.getDate() + 6);
    return { from: start, to: end };
  }
  if (view === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    return { from: start, to: end };
  }
  return { from: startOfDay(anchor), to: endOfDay(anchor) };
}

export default function AdminReservationsPage() {
  usePageHeader({ title: 'Reservations' });
  const [view, setView] = React.useState<View>('day');
  const [anchor, setAnchor] = React.useState<Date>(new Date());

  const range = rangeForView(view, anchor);
  const list = useReservations({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    limit: 100,
  });
  const tables = useTables();
  const restaurant = useQuery<RestaurantPublicDto>({
    queryKey: ['restaurant', 'public'],
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60_000,
  });
  const tz = restaurant.data?.timezone ?? null;

  const blocks = React.useMemo(() => (list.data?.items ?? []).map(toBlock), [list.data]);
  const calTables = React.useMemo(() => (tables.data ?? []).map(toCalTable), [tables.data]);

  const [conflict, setConflict] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-h1 font-semibold text-fg">Reservations</h1>
          <span className="text-small text-fg-muted">{list.data?.items.length ?? 0} in view</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)]">
            <ViewTab
              id="day"
              active={view === 'day'}
              onClick={() => setView('day')}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
            >
              Day
            </ViewTab>
            <ViewTab
              id="week"
              active={view === 'week'}
              onClick={() => setView('week')}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
            >
              Week
            </ViewTab>
            <ViewTab
              id="month"
              active={view === 'month'}
              onClick={() => setView('month')}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
            >
              Month
            </ViewTab>
            <ViewTab
              id="list"
              active={view === 'list'}
              onClick={() => setView('list')}
              icon={<ListTree className="h-3.5 w-3.5" />}
            >
              List
            </ViewTab>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-button bg-accent px-4 text-small font-medium text-bg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> New reservation
          </button>
        </div>
      </div>

      {conflict && (
        <div className="rounded-button border border-negative/40 bg-negative/10 px-4 py-2 text-small text-negative">
          {conflict}{' '}
          <button type="button" onClick={() => setConflict(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <div
        className="rounded-card border border-border/[var(--border-alpha)] bg-surface"
        style={{ height: 640 }}
      >
        {list.isLoading || tables.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="xl" />
          </div>
        ) : list.isError ? (
          <EmptyState
            title="Couldn't load reservations"
            description={(list.error as Error)?.message}
            action={{ label: 'Retry', onClick: () => list.refetch() }}
          />
        ) : view === 'list' ? (
          <ReservationsList
            items={list.data?.items ?? []}
            tables={tables.data ?? []}
            timezone={tz}
          />
        ) : (
          <ReservationCalendar
            mode={view}
            date={anchor}
            blocks={blocks}
            tables={calTables}
            onDateChange={setAnchor}
            onBlockClick={(id) => {
              window.location.href = `/reservations/${id}`;
            }}
            onMove={async (id, target) => {
              try {
                await getApiClient().reservations.move(id, target);
                list.refetch();
                setConflict(null);
              } catch (err) {
                const e = err as { status?: number; message: string };
                if (e.status === 409) {
                  setConflict('That table + time is already booked. Try another slot.');
                  list.refetch();
                } else {
                  setConflict(e.message);
                }
              }
            }}
          />
        )}
      </div>

      <ReservationCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStart={anchor}
      />
    </div>
  );
}

function ViewTab({
  id: _id,
  active,
  onClick,
  icon,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 px-3 text-small transition-colors ${
        active ? 'bg-accent-muted text-fg' : 'text-fg-muted hover:bg-surface-warm/30 hover:text-fg'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ReservationsList({
  items,
  tables,
  timezone,
}: {
  items: ReservationDto[];
  tables: TableDto[];
  timezone: string | null;
}) {
  const tableNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tables) m.set(t.id, t.name);
    return m;
  }, [tables]);
  if (items.length === 0) {
    return (
      <EmptyState
        title="No reservations in range"
        description="Adjust the date or use the calendar view."
      />
    );
  }
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-small">
        <thead className="sticky top-0 bg-surface text-caption uppercase tracking-wider text-fg-subtle">
          <tr>
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">Guest</th>
            <th className="px-4 py-3 text-left">Party</th>
            <th className="px-4 py-3 text-left">Table</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr
              key={r.id}
              className="cursor-pointer border-t border-border/[var(--border-alpha)] hover:bg-surface-2/40"
              onClick={() => {
                window.location.href = `/reservations/${r.id}`;
              }}
            >
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-fg">
                {formatRestaurantDateTime(r.startAt, timezone, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3 text-fg">
                <div>{r.contactName}</div>
                <div className="text-caption uppercase tracking-wider text-fg-subtle">
                  {r.contactPhone}
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums text-fg">{r.guestCount}</td>
              <td className="px-4 py-3 text-fg-muted">
                {r.tableId ? (tableNameById.get(r.tableId) ?? r.tableId) : '—'}
              </td>
              <td className="px-4 py-3">
                <ReservationStatusBadge status={r.status} />
              </td>
              <td className="max-w-xs px-4 py-3 truncate text-fg-muted">{r.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservationStatusBadge({ status }: { status: ReservationDto['status'] }) {
  const upper = status.toUpperCase() as ReservationCalendarStatus;
  const t = STATUS_TOKENS[upper];
  return (
    <span
      className={`inline-flex items-center rounded-button px-2 py-0.5 text-caption uppercase tracking-wider ${t.bg} ${t.fg}`}
    >
      {t.label}
    </span>
  );
}
