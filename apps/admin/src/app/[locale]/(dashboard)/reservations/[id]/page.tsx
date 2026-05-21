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
import { Link } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import type { ReservationDto, RestaurantPublicDto } from '@repo/types';
import { ActionModal, EmptyState, KeyValueGrid, PageSpinner, SettingsSectionCard } from '@repo/ui';
import { formatRestaurantDateTime } from '@repo/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, MoveRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import * as React from 'react';

const STATUS_TINT: Record<ReservationDto['status'], string> = {
  confirmed: 'bg-info/15 text-info',
  seated: 'bg-accent/15 text-accent',
  completed: 'bg-positive/15 text-positive',
  cancelled: 'bg-negative/15 text-negative',
  no_show: 'bg-warning/15 text-warning',
};

export default function AdminReservationDetailPage() {
  const t = useTranslations('admin.reservations.detail');
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
    title: q.data ? t('titleWithName', { name: q.data.contactName }) : t('title'),
  });

  React.useEffect(() => {
    if (q.data?.tableId) setSelectedTable(q.data.tableId);
  }, [q.data?.tableId]);

  if (q.isLoading) {
    return <PageSpinner label={t('loading')} />;
  }

  if (q.isError || !q.data) {
    return (
      <EmptyState
        title={t('notFound.title')}
        description={q.error?.message ?? t('notFound.description')}
        action={{ label: t('notFound.back'), href: '/reservations' }}
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
            <ArrowLeft className="h-4 w-4" /> {t('backLink')}
          </Link>
          <span className="text-fg-subtle">/</span>
          <h1 className="text-h1 font-semibold text-fg">{r.contactName}</h1>
          <span
            className={`inline-flex items-center rounded-button px-2 py-0.5 text-caption uppercase tracking-wider ${STATUS_TINT[r.status]}`}
          >
            {t(`status.${r.status}`)}
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
              <MoveRight className="h-4 w-4" /> {t('actions.seat')}
            </button>
          )}
          {r.status === 'seated' && (
            <button
              type="button"
              disabled={complete.isPending}
              onClick={() => setConfirm('complete')}
              className="inline-flex h-9 items-center gap-2 rounded-button bg-positive px-4 text-small font-medium text-bg hover:bg-positive/90"
            >
              <Check className="h-4 w-4" /> {t('actions.complete')}
            </button>
          )}
          {(r.status === 'confirmed' || r.status === 'seated') && (
            <button
              type="button"
              disabled={noShow.isPending}
              onClick={() => setConfirm('noshow')}
              className="h-9 rounded-button border border-warning/40 px-3 text-small text-warning hover:bg-warning/10"
            >
              {t('actions.noShow')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SettingsSectionCard
            id="when"
            title={t('booking.title')}
            description={t('booking.description')}
          >
            <KeyValueGrid
              rows={[
                {
                  label: t('booking.start'),
                  value: formatRestaurantDateTime(r.startAt, tz),
                },
                {
                  label: t('booking.end'),
                  value: formatRestaurantDateTime(r.endAt, tz, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                {
                  label: t('booking.party'),
                  value: t('booking.guests', { count: r.guestCount }),
                },
                {
                  label: t('booking.table'),
                  value: r.tableId
                    ? (tables.data?.find((tbl) => tbl.id === r.tableId)?.name ?? r.tableId)
                    : t('booking.unseated'),
                },
              ]}
            />
            {!isFinalized && (
              <div className="border-t border-border/[var(--border-alpha)] pt-4">
                <label className="block">
                  <span className="mb-1 block text-caption uppercase tracking-wider text-fg-subtle">
                    {t('booking.reassignLabel')}
                  </span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg outline-none focus:border-accent"
                  >
                    <option value="">{t('booking.pickTable')}</option>
                    {(tables.data ?? []).map((tbl) => (
                      <option key={tbl.id} value={tbl.id}>
                        {t('booking.tableOption', { name: tbl.name, capacity: tbl.capacity })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </SettingsSectionCard>

          <SettingsSectionCard
            id="customer"
            title={t('customer.title')}
            description={t('customer.description')}
          >
            <KeyValueGrid
              rows={[
                { label: t('customer.name'), value: r.contactName },
                { label: t('customer.phone'), value: r.contactPhone },
                { label: t('customer.notes'), value: r.notes ?? t('customer.empty') },
              ]}
            />
          </SettingsSectionCard>

          <SettingsSectionCard
            id="timeline"
            title={t('timeline.title')}
            description={t('timeline.description')}
          >
            <KeyValueGrid
              rows={[
                {
                  label: t('timeline.created'),
                  value: formatRestaurantDateTime(r.createdAt, tz),
                },
                {
                  label: t('timeline.updated'),
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
              title={t('cancel.title')}
              description={t('cancel.description')}
              tone="danger"
            >
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('cancel.reasonPlaceholder')}
                rows={3}
                className="w-full resize-y rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 py-2 text-small text-fg outline-none focus:border-negative"
              />
              <button
                type="button"
                disabled={cancel.isPending || cancelReason.trim().length === 0}
                onClick={() => cancel.mutate({ reason: cancelReason.trim() })}
                className="inline-flex h-9 items-center gap-2 rounded-button border border-negative/40 px-4 text-small text-negative hover:bg-negative/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> {t('cancel.cta')}
              </button>
            </SettingsSectionCard>
          )}
        </aside>
      </div>

      <ActionModal
        open={confirm === 'complete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t('completeModal.title')}
        description={t('completeModal.description')}
        primary={{
          label: t('completeModal.primary'),
          onClick: () => {
            complete.mutate();
            setConfirm(null);
          },
        }}
        secondary={{ label: t('completeModal.secondary'), onClick: () => setConfirm(null) }}
      />

      <ActionModal
        open={confirm === 'noshow'}
        onOpenChange={(o) => !o && setConfirm(null)}
        variant="destructive"
        title={t('noShowModal.title')}
        description={t('noShowModal.description')}
        primary={{
          label: t('noShowModal.primary'),
          onClick: () => {
            noShow.mutate();
            setConfirm(null);
          },
        }}
        secondary={{ label: t('noShowModal.secondary'), onClick: () => setConfirm(null) }}
      />
    </div>
  );
}
