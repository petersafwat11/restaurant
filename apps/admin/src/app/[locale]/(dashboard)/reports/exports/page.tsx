'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { CreateExportModal } from '@/features/reports/components';
import { useDownloadExport, useExports } from '@/features/reports/hooks';
import { type ExportDto, type ExportStatus } from '@repo/types';
import { Button, type ColumnDef, DataTable, RelativeTime } from '@repo/ui';
import { Download, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const STATUS_CLS: Record<ExportStatus, string> = {
  queued: 'bg-fg-subtle/[0.12] text-fg-muted',
  processing: 'bg-info/[0.12] text-info',
  ready: 'bg-positive/[0.12] text-positive',
  failed: 'bg-negative/[0.12] text-negative',
};

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExportsPage() {
  const t = useTranslations('admin.reports.exports');
  const { has } = usePermissions();
  const [createOpen, setCreateOpen] = React.useState(false);
  const q = useExports();
  const download = useDownloadExport();

  const canExport = has('report:export');

  usePageHeader({
    title: t('title'),
    rightExtras: canExport ? (
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Plus size={14} /> {t('newExport')}
      </Button>
    ) : null,
  });

  const rows = q.data ?? [];

  const columns = React.useMemo<ColumnDef<ExportDto>[]>(
    () => [
      {
        id: 'kind',
        header: t('columns.report'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-fg">{t(`kinds.${row.original.kind}`)}</span>
            <span className="text-xs text-fg-subtle">{t(`format.${row.original.format}`)}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => (
          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${STATUS_CLS[row.original.status]}`}
          >
            {t(`rowStatus.${row.original.status}`)}
          </span>
        ),
      },
      {
        id: 'size',
        header: t('columns.size'),
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-fg-muted">{fmtSize(row.original.fileSize)}</span>
        ),
      },
      {
        id: 'createdAt',
        header: t('columns.created'),
        cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
      },
      {
        id: 'expiresAt',
        header: t('columns.expires'),
        cell: ({ row }) => <RelativeTime value={row.original.expiresAt} />,
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const r = row.original;
          if (r.status !== 'ready') {
            return r.status === 'failed' && r.errorMessage ? (
              <span className="text-xs text-negative" title={r.errorMessage}>
                {t('actions.error')}
              </span>
            ) : (
              <span className="text-xs text-fg-subtle">{t('actions.dash')}</span>
            );
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                download.mutate(r.id);
              }}
            >
              <Download size={14} /> {t('actions.download')}
            </Button>
          );
        },
      },
    ],
    [download, t],
  );

  return (
    <RequirePermission perm={['report:read', 'report:export']} mode="any">
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        emptyState={<div className="text-sm text-fg-muted">{t('empty')}</div>}
        labels={{
          errorTitle: t('dataTable.errorTitle'),
          retry: t('dataTable.retry'),
          noResults: t('dataTable.noResults'),
          selectAll: t('dataTable.selectAll'),
          selectRow: t('dataTable.selectRow'),
        }}
      />
      <CreateExportModal open={createOpen} onOpenChange={setCreateOpen} />
    </RequirePermission>
  );
}
