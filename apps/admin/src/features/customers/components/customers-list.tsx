'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useBroadcastEmail,
  useBulkTagCustomers,
  useCustomerTags,
  useCustomers,
  useExportCustomers,
} from '@/features/customers/hooks';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  CUSTOMER_SEGMENTS,
  type CustomerListQuery,
  type CustomerSegment,
  type CustomerSummaryDto,
} from '@repo/types';
import {
  ActionModal,
  BulkActionBar,
  Button,
  type ColumnDef,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FilterPillGroup,
  Input,
  Label,
  PageHeader,
  RelativeTime,
  Textarea,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as React from 'react';
import { CustomerDrawer } from './customer-drawer';

type SegmentFilter = 'all' | CustomerSegment;

export function CustomersList({ initialCustomerId }: { initialCustomerId?: string }) {
  const { has } = usePermissions();
  const [segment, setSegment] = React.useState<SegmentFilter>('all');
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedId, setSelectedId] = React.useState<string | null>(initialCustomerId ?? null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [tagId, setTagId] = React.useState<string>('');
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);
  const [emailSubject, setEmailSubject] = React.useState('');
  const [emailBody, setEmailBody] = React.useState('');

  const tagsQuery = useCustomerTags();
  const bulkTag = useBulkTagCustomers();
  const broadcast = useBroadcastEmail();
  const exportCustomers = useExportCustomers();
  const canTag = has('customer:tag');
  const canEmail = has('customer:email');

  usePageHeader({ title: 'Customers' });

  const onExport = React.useCallback(
    (format: 'csv' | 'pdf') => {
      exportCustomers.mutate({
        segment: segment === 'all' ? undefined : segment,
        search: debouncedSearch.trim() || undefined,
        format,
      });
    },
    [exportCustomers, segment, debouncedSearch],
  );

  const query = React.useMemo<CustomerListQuery>(
    () => ({
      segment: segment === 'all' ? undefined : segment,
      search: debouncedSearch.trim() || undefined,
      limit: 50,
    }),
    [segment, debouncedSearch],
  );

  const q = useCustomers(query);
  const rows = q.data?.items ?? [];

  const columns = React.useMemo<ColumnDef<CustomerSummaryDto>[]>(
    () => [
      {
        id: 'name',
        header: 'Customer',
        cell: ({ row }) => {
          const r = row.original;
          const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email;
          return (
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-xs text-fg-muted">
                {(r.firstName?.[0] ?? r.email[0] ?? '?').toUpperCase()}
              </span>
              <div className="flex flex-col">
                <span className="text-fg">{name}</span>
                <span className="text-xs text-fg-subtle">{r.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="tabular-nums text-fg-muted">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'orders',
        header: 'Orders',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-fg">{row.original.lifetimeOrders}</span>
        ),
      },
      {
        id: 'spend',
        header: 'Lifetime spend',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums text-fg">
            {formatMoney(row.original.lifetimeSpend, 'USD')}
          </span>
        ),
      },
      {
        id: 'last',
        header: 'Last order',
        cell: ({ row }) =>
          row.original.lastOrderAt ? (
            <RelativeTime value={row.original.lastOrderAt} />
          ) : (
            <span className="text-fg-subtle">—</span>
          ),
      },
      {
        id: 'segment',
        header: 'Segment',
        cell: ({ row }) =>
          row.original.segment ? (
            <span className="inline-flex h-5 items-center rounded-full bg-accent/[0.10] px-2 text-[11px] text-accent">
              {row.original.segment}
            </span>
          ) : (
            <span className="text-fg-subtle">—</span>
          ),
      },
    ],
    [],
  );

  if (!has('customer:read')) {
    return (
      <div className="grid place-items-center rounded-card border-hairline bg-surface p-12 text-sm text-fg-muted">
        You don't have permission to view customers.
      </div>
    );
  }

  return (
    <>
      <PageHeader
        rows={[
          <div key="row1" className="flex w-full flex-wrap items-center gap-3">
            <FilterPillGroup<SegmentFilter>
              value={segment}
              onChange={setSegment}
              options={[
                { id: 'all', label: 'All' },
                ...CUSTOMER_SEGMENTS.map((s) => ({ id: s as SegmentFilter, label: s })),
              ]}
            />
            <Input
              type="search"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto h-8 w-72 text-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportCustomers.isPending || rows.length === 0}
                  aria-label="Export customers"
                >
                  {exportCustomers.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Export
                  <ChevronDown size={12} className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  <FileSpreadsheet size={14} /> Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <FileText size={14} /> Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>,
        ]}
      />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        onRowClick={(r) => setSelectedId(r.id)}
        selection={canTag || canEmail ? { selected, onChange: setSelected } : undefined}
        emptyState={<div className="text-sm text-fg-muted">No customers match these filters.</div>}
      />

      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          actions={[
            ...(canTag
              ? [
                  {
                    id: 'tag',
                    label: 'Tag…',
                    onClick: () => setTagModalOpen(true),
                  },
                ]
              : []),
            ...(canEmail
              ? [
                  {
                    id: 'email',
                    label: 'Send email…',
                    onClick: () => setEmailModalOpen(true),
                  },
                ]
              : []),
          ]}
        />
      )}

      <ActionModal
        open={tagModalOpen}
        onOpenChange={setTagModalOpen}
        title="Apply tag to selected customers"
        description={`Applies one tag to ${selected.size} customer${selected.size === 1 ? '' : 's'}.`}
        primary={{
          label: bulkTag.isPending ? 'Tagging…' : 'Apply tag',
          loading: bulkTag.isPending,
          onClick: () => {
            if (!tagId) return;
            bulkTag.mutate(
              { userIds: Array.from(selected), tagId, action: 'ADD' },
              { onSuccess: () => setTagModalOpen(false) },
            );
          },
        }}
        secondary={{ label: 'Cancel', onClick: () => setTagModalOpen(false) }}
      >
        <div className="space-y-2">
          <Label htmlFor="tag-select">Tag</Label>
          <select
            id="tag-select"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
          >
            <option value="">Select a tag…</option>
            {(tagsQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {tagsQuery.data && tagsQuery.data.length === 0 && (
            <p className="text-xs text-fg-subtle">
              No tags yet. Create one in customer settings first.
            </p>
          )}
        </div>
      </ActionModal>

      <ActionModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        title="Send promotional email"
        description={`Queues an email to ${selected.size} customer${selected.size === 1 ? '' : 's'} via the email worker.`}
        primary={{
          label: broadcast.isPending ? 'Queuing…' : 'Send',
          loading: broadcast.isPending,
          onClick: () => {
            if (!emailSubject.trim() || !emailBody.trim()) return;
            broadcast.mutate(
              {
                subject: emailSubject.trim(),
                body: emailBody.trim(),
                userIds: Array.from(selected),
              },
              {
                onSuccess: () => {
                  setEmailModalOpen(false);
                  setEmailSubject('');
                  setEmailBody('');
                },
              },
            );
          },
        }}
        secondary={{ label: 'Cancel', onClick: () => setEmailModalOpen(false) }}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="bcast-subj">Subject</Label>
            <Input
              id="bcast-subj"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bcast-body">Body</Label>
            <Textarea
              id="bcast-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={6}
            />
          </div>
          <p className="text-xs text-fg-subtle">
            Plain text. The worker prepends a personalised greeting for each recipient.
          </p>
        </div>
      </ActionModal>

      <CustomerDrawer customerId={selectedId} onOpenChange={(o) => !o && setSelectedId(null)} />
    </>
  );
}
