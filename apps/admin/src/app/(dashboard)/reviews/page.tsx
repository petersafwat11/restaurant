'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import { ReviewDrawer, ReviewStars } from '@/features/reviews/components';
import { useAdminReviews } from '@/features/reviews/hooks';
import type { ReviewDto, ReviewListQuery } from '@repo/types';
import { type ColumnDef, DataTable, FilterPillGroup, PageHeader, RelativeTime } from '@repo/ui';
import * as React from 'react';

type StatusFilter = 'all' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

export default function ReviewsPage() {
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = React.useState<number | 'all'>('all');
  const [selected, setSelected] = React.useState<ReviewDto | null>(null);

  usePageHeader({ title: 'Reviews' });

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
        header: 'Rating',
        cell: ({ row }) => <ReviewStars rating={row.original.rating} />,
      },
      {
        id: 'author',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-fg">{row.original.authorName ?? 'Anonymous'}</span>
        ),
      },
      {
        id: 'comment',
        header: 'Comment',
        cell: ({ row }) => (
          <span className="line-clamp-1 text-fg-muted">{row.original.comment ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
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
              {s}
            </span>
          );
        },
      },
      {
        id: 'reply',
        header: 'Reply',
        cell: ({ row }) =>
          row.original.ownerReply ? (
            <span className="text-xs text-positive">replied</span>
          ) : (
            <span className="text-xs text-fg-subtle">—</span>
          ),
      },
      {
        id: 'createdAt',
        header: 'Posted',
        cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
      },
    ],
    [],
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
                { id: 'all', label: 'All' },
                { id: 'PUBLISHED', label: 'Published' },
                { id: 'HIDDEN', label: 'Hidden' },
                { id: 'FLAGGED', label: 'Flagged' },
              ]}
            />
            <div className="flex items-center gap-1 text-xs text-fg-subtle">
              <span>Rating:</span>
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
                  {r === 'all' ? 'All' : `${r}★`}
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
        emptyState={<div className="text-sm text-fg-muted">No reviews match these filters.</div>}
      />
      <ReviewDrawer review={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </RequirePermission>
  );
}
