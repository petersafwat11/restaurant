'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import {
  useCancelReservation,
  useCompleteReservation,
  useNoShowReservation,
  useReservation,
  useSeatReservation,
  useTables,
} from '@/features/reservations/hooks';
import { getApiClient } from '@/lib/api-client';
import type { ReservationDto, RestaurantPublicDto } from '@repo/types';
import { ActionModal, EmptyState, KeyValueGrid, PageSpinner, SettingsSectionCard } from '@repo/ui';
import { formatRestaurantDateTime } from '@repo/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, MoveRight, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

const STATUS_LABEL: Record<ReservationDto['status'], string> = {
  confirmed: 'Confirmed',
  seated: 'Seated',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const STATUS_TINT: Record<ReservationDto['status'], string> = {
  confirmed: 'bg-info/15 text-info',
  seated: 'bg-accent/15 text-accent',
  completed: 'bg-positive/15 text-positive',
  cancelled: 'bg-negative/15 text-negative',
  no_show: 'bg-warning/15 text-warning',
};

export default function AdminReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const q = useReservation(id);
  const seat = useSeatReservation(id);
  const complete = useCompleteReservation(id);
  const noShow = useNoShowReservation(id);
  const cancel = useCancelReservation(id);
  const tables = useTables();
  const restaurant = useQuery<RestaurantPublicDto>({
    queryKey: ['restaurant', 'public'],
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60_000,
  });
  const tz = restaurant.data?.timezone ?? null;
  const [cancelReason, setCancelReason] = React.useState('');
  const [selectedTable, setSelectedTable] = React.useState<string>('');
  const [confirm, setConfirm] = React.useState<'complete' | 'noshow' | null>(null);

  usePageHeader({
    title: q.data ? `Reservation · ${q.data.contactName}` : 'Reservation',
  });

  React.useEffect(() => {
    if (q.data?.tableId) setSelectedTable(q.data.tableId);
  }, [q.data?.tableId]);

  if (q.isLoading) {
    return <PageSpinner label="Loading reservation…" />;
  }

  if (q.isError || !q.data) {
    return (
      <EmptyState
        title="Reservation not found"
        description={q.error?.message ?? 'It may have been removed.'}
        action={{ label: '← Back to reservations', href: '/reservations' }}
        size="lg"
      />
    );
  }

  const r = q.data;
  const isFinalized =
    r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_show';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/reservations"
            className="inline-flex h-8 items-center gap-1 text-small text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> Reservations
          </Link>
          <span className="text-fg-subtle">/</span>
          <h1 className="text-h1 font-semibold text-fg">{r.contactName}</h1>
          <span
            className={`inline-flex items-center rounded-button px-2 py-0.5 text-caption uppercase tracking-wider ${STATUS_TINT[r.status]}`}
          >
            {STATUS_LABEL[r.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {r.status === 'confirmed' && (
            <button
              type="button"
              disabled={seat.isPending || !selectedTable}
              onClick={() => selectedTable && seat.mutate({ tableId: selectedTable })}
              className="inline-flex h-9 items-center gap-2 rounded-button bg-accent px-4 text-small font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
            >
              <MoveRight className="h-4 w-4" /> Seat
            </button>
          )}
          {r.status === 'seated' && (
            <button
              type="button"
              disabled={complete.isPending}
              onClick={() => setConfirm('complete')}
              className="inline-flex h-9 items-center gap-2 rounded-button bg-positive px-4 text-small font-medium text-bg hover:bg-positive/90"
            >
              <Check className="h-4 w-4" /> Complete
            </button>
          )}
          {(r.status === 'confirmed' || r.status === 'seated') && (
            <button
              type="button"
              disabled={noShow.isPending}
              onClick={() => setConfirm('noshow')}
              className="h-9 rounded-button border border-warning/40 px-3 text-small text-warning hover:bg-warning/10"
            >
              No-show
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SettingsSectionCard id="when" title="Booking" description="Time, party size, and table.">
            <KeyValueGrid
              rows={[
                {
                  label: 'Start',
                  value: formatRestaurantDateTime(r.startAt, tz),
                },
                {
                  label: 'End',
                  value: formatRestaurantDateTime(r.endAt, tz, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                {
                  label: 'Party',
                  value: `${r.guestCount} ${r.guestCount === 1 ? 'guest' : 'guests'}`,
                },
                {
                  label: 'Table',
                  value: r.tableId
                    ? (tables.data?.find((t) => t.id === r.tableId)?.name ?? r.tableId)
                    : 'Unseated',
                },
              ]}
            />
            {!isFinalized && (
              <div className="border-t border-border/[var(--border-alpha)] pt-4">
                <label className="block">
                  <span className="mb-1 block text-caption uppercase tracking-wider text-fg-subtle">
                    Assign / reassign table
                  </span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg outline-none focus:border-accent"
                  >
                    <option value="">— Pick a table —</option>
                    {(tables.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (cap {t.capacity})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </SettingsSectionCard>

          <SettingsSectionCard
            id="customer"
            title="Customer"
            description="Contact info captured at booking time."
          >
            <KeyValueGrid
              rows={[
                { label: 'Name', value: r.contactName },
                { label: 'Phone', value: r.contactPhone },
                { label: 'Notes', value: r.notes ?? '—' },
              ]}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            id="timeline"
            title="Timeline"
            description="Created and last-updated stamps."
          >
            <KeyValueGrid
              rows={[
                {
                  label: 'Created',
                  value: formatRestaurantDateTime(r.createdAt, tz),
                },
                {
                  label: 'Updated',
                  value: formatRestaurantDateTime(r.updatedAt, tz),
                },
              ]}
            />
          </SettingsSectionCard>
        </div>

        <aside className="space-y-4">
          {!isFinalized && (
            <SettingsSectionCard
              id="cancel"
              title="Cancel reservation"
              description="Frees the table for the slot. Customer is not notified automatically — call them."
              tone="danger"
            >
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (required)"
                rows={3}
                className="w-full resize-y rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 py-2 text-small text-fg outline-none focus:border-negative"
              />
              <button
                type="button"
                disabled={cancel.isPending || cancelReason.trim().length === 0}
                onClick={() => cancel.mutate({ reason: cancelReason.trim() })}
                className="inline-flex h-9 items-center gap-2 rounded-button border border-negative/40 px-4 text-small text-negative hover:bg-negative/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Cancel reservation
              </button>
            </SettingsSectionCard>
          )}
        </aside>
      </div>

      <ActionModal
        open={confirm === 'complete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Mark reservation complete?"
        description="Frees the table and records the visit as finished."
        primary={{
          label: 'Complete',
          onClick: () => {
            complete.mutate();
            setConfirm(null);
          },
        }}
        secondary={{ label: 'Cancel', onClick: () => setConfirm(null) }}
      />

      <ActionModal
        open={confirm === 'noshow'}
        onOpenChange={(o) => !o && setConfirm(null)}
        variant="destructive"
        title="Mark as no-show?"
        description="The reservation will be closed and the table freed."
        primary={{
          label: 'Mark no-show',
          onClick: () => {
            noShow.mutate();
            setConfirm(null);
          },
        }}
        secondary={{ label: 'Cancel', onClick: () => setConfirm(null) }}
      />
    </div>
  );
}
