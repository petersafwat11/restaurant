'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import { ReviewDrawer, ReviewStars } from '@/features/reviews/components';
import { useAdminReviews } from '@/features/reviews/hooks';
import type { ReviewDto, ReviewListQuery } from '@repo/types';
import { type ColumnDef, DataTable, FilterPillGroup, PageHeader, RelativeTime } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type StatusFilter = 'all' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

export default function ReviewsPage() {
  const t = useTranslations('admin.reviews');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = React.useState<number | 'all'>('all');
  const [selected, setSelected] = React.useState<ReviewDto | null>(null);

  usePageHeader({ title: t('title') });

  const query = React.useMemo<ReviewListQuery>(
    () => ({
      moderationStatus: status === 'all' ? undefined : status,
      rating: ratingFilter === 'all' ? undefined : ratingFilter,
      sort: 'recent',
      limit: 50,
    }),
    [status, ratingFilter],
  );

  const q = useAdminReviews(query);
  const rows = q.data?.items ?? [];

  const columns = React.useMemo<ColumnDef<ReviewDto>[]>(
    () => [
      {
        id: 'rating',
        header: t('columns.rating'),
        cell: ({ row }) => <ReviewStars rating={row.original.rating} />,
      },
      {
        id: 'author',
        header: t('columns.author'),
        cell: ({ row }) => (
          <span className="text-fg">{row.original.authorName ?? t('row.anonymous')}</span>
        ),
      },
      {
        id: 'comment',
        header: t('columns.comment'),
        cell: ({ row }) => (
          <span className="line-clamp-1 text-fg-muted">
            {row.original.comment ?? t('row.noComment')}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          const s = row.original.moderationStatus;
          const cls =
            s === 'PUBLISHED'
              ? 'bg-positive/[0.12] text-positive'
              : s === 'FLAGGED'
                ? 'bg-warning/[0.12] text-warning'
                : 'bg-fg-subtle/[0.12] text-fg-muted';
          return (
            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${cls}`}>
              {t(`moderation.${s}`)}
            </span>
          );
        },
      },
      {
        id: 'reply',
        header: t('columns.reply'),
        cell: ({ row }) =>
          row.original.ownerReply ? (
            <span className="text-xs text-positive">{t('row.replied')}</span>
          ) : (
            <span className="text-xs text-fg-subtle">{t('row.noReply')}</span>
          ),
      },
      {
        id: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
      },
    ],
    [t],
  );

  return (
    <RequirePermission perm={['review:read', 'review:moderate']} mode="any">
      <PageHeader
        rows={[
          <div key="row1" className="flex w-full flex-wrap items-center gap-3">
            <FilterPillGroup<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { id: 'all', label: t('filters.status.all') },
                { id: 'PUBLISHED', label: t('filters.status.PUBLISHED') },
                { id: 'HIDDEN', label: t('filters.status.HIDDEN') },
                { id: 'FLAGGED', label: t('filters.status.FLAGGED') },
              ]}
            />
            <div className="flex items-center gap-1 text-xs text-fg-subtle">
              <span>{t('filters.ratingLabel')}</span>
              {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatingFilter(r)}
                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs transition-colors ${
                    ratingFilter === r
                      ? 'border-accent/40 bg-accent/[0.10] text-fg'
                      : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:text-fg'
                  }`}
                >
                  {r === 'all' ? t('filters.ratingAll') : t('filters.ratingStars', { value: r })}
                </button>
              ))}
            </div>
          </div>,
        ]}
      />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        onRowClick={(r) => setSelected(r)}
        emptyState={<div className="text-sm text-fg-muted">{t('empty')}</div>}
      />
      <ReviewDrawer review={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </RequirePermission>
  );
}
