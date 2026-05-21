'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import { ContactDrawer } from '@/features/contact/components';
import { useContactMessages } from '@/features/contact/hooks';
import {
  CONTACT_STATUSES,
  type ContactMessageDto,
  type ContactMessageListQuery,
  type ContactStatus,
} from '@repo/types';
import { type ColumnDef, DataTable, FilterPillGroup, PageHeader, RelativeTime } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type StatusFilter = 'all' | ContactStatus;

const STATUS_DOT: Record<ContactStatus, string> = {
  new: 'bg-info',
  read: 'bg-fg-muted',
  archived: 'bg-fg-subtle',
};

export default function ContactPage() {
  const t = useTranslations('admin.contact');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [selected, setSelected] = React.useState<ContactMessageDto | null>(null);

  usePageHeader({ title: t('title') });

  const query = React.useMemo<ContactMessageListQuery>(
    () => ({
      status: status === 'all' ? undefined : status,
      limit: 50,
    }),
    [status],
  );

  const q = useContactMessages(query);
  const rows = q.data?.items ?? [];

  const counts = React.useMemo(() => {
    const c: Record<StatusFilter, number> = { all: rows.length, new: 0, read: 0, archived: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const columns = React.useMemo<ColumnDef<ContactMessageDto>[]>(
    () => [
      {
        id: 'subject',
        header: t('columns.subject'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-fg">{row.original.subject ?? t('row.noSubject')}</span>
            <span className="line-clamp-1 text-xs text-fg-subtle">{row.original.message}</span>
          </div>
        ),
      },
      {
        id: 'from',
        header: t('columns.from'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-fg">{row.original.name}</span>
            <span className="text-xs text-fg-subtle">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[row.original.status]}`}
            />
            {t(`filters.status.${row.original.status}`)}
          </span>
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
    <RequirePermission perm="contact:read">
      <PageHeader
        rows={[
          <FilterPillGroup<StatusFilter>
            key="filter"
            value={status}
            onChange={setStatus}
            options={[
              { id: 'all', label: t('filters.all'), count: counts.all },
              ...CONTACT_STATUSES.map((s) => ({
                id: s as StatusFilter,
                label: t(`filters.status.${s}`),
                count: counts[s],
                dot: true,
                dotClassName: STATUS_DOT[s],
              })),
            ]}
          />,
        ]}
      />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        onRowClick={(r) => setSelected(r)}
        rowDecorator={(r) =>
          r.status === 'new'
            ? { borderInsetClass: 'shadow-[inset_2px_0_0_rgb(var(--info))]' }
            : undefined
        }
        emptyState={<div className="text-sm text-fg-muted">{t('empty')}</div>}
      />
      <ContactDrawer message={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </RequirePermission>
  );
}
