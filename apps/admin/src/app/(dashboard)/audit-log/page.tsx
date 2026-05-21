'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { AuditDiffDrawer, AuditFilters, type AuditFiltersState } from '@/features/audit/components';
import { useAuditLog } from '@/features/audit/hooks';
import { RequirePermission } from '@/features/auth/components';
import type { AuditLogEntryDto, AuditLogListQuery } from '@repo/types';
import { type ColumnDef, DataTable, PageHeader, RelativeTime } from '@repo/ui';
import * as React from 'react';

const DEFAULT_FILTERS: AuditFiltersState = {
  actorUserId: '',
  action: '',
  resourceType: '',
  from: '',
  to: '',
};

export default function AuditLogPage() {
  const [filters, setFilters] = React.useState<AuditFiltersState>(DEFAULT_FILTERS);
  const [selectedEntry, setSelectedEntry] = React.useState<AuditLogEntryDto | null>(null);

  usePageHeader({ title: 'Audit log' });

  const query = React.useMemo<AuditLogListQuery>(
    () => ({
      actorUserId: filters.actorUserId.trim() || undefined,
      action: filters.action || undefined,
      resourceType: filters.resourceType || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      limit: 50,
    }),
    [filters],
  );

  const q = useAuditLog(query);
  const rows = q.data?.items ?? [];

  const columns = React.useMemo<ColumnDef<AuditLogEntryDto>[]>(
    () => [
      {
        id: 'createdAt',
        header: 'When',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <RelativeTime value={row.original.createdAt} />
            <span className="text-[11px] text-fg-subtle">
              {new Date(row.original.createdAt).toISOString()}
            </span>
          </div>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-fg-muted">{row.original.actorUserId}</span>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => <span className="font-mono text-xs text-fg">{row.original.action}</span>,
      },
      {
        id: 'resource',
        header: 'Resource',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-fg">{row.original.resourceType}</span>
            <span className="font-mono text-[11px] text-fg-subtle">{row.original.resourceId}</span>
          </div>
        ),
      },
      {
        id: 'ip',
        header: 'IP',
        cell: ({ row }) => (
          <span className="tabular-nums text-xs text-fg-subtle">{row.original.ip ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  const hasFilter = Boolean(
    filters.actorUserId || filters.action || filters.resourceType || filters.from || filters.to,
  );

  return (
    <RequirePermission perm="audit:read">
      <PageHeader
        rows={
          [
            <AuditFilters key="filters" value={filters} onChange={setFilters} />,
            hasFilter ? (
              <button
                key="clear"
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs text-fg-subtle hover:text-fg"
              >
                Clear filters
              </button>
            ) : null,
          ].filter(Boolean) as React.ReactNode[]
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        onRowClick={(r) => setSelectedEntry(r)}
        emptyState={
          <div className="text-sm text-fg-muted">No audit log entries match these filters.</div>
        }
      />
      <AuditDiffDrawer entry={selectedEntry} onOpenChange={(o) => !o && setSelectedEntry(null)} />
    </RequirePermission>
  );
}
