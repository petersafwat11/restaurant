'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { usePromotion, usePromotions } from '@/features/promotions/hooks';
import type { PromotionDto } from '@repo/types';
import { Button, type ColumnDef, DataTable } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Plus } from 'lucide-react';
import * as React from 'react';
import { CreatePromotionModal } from './create-promotion-modal';
import { PromotionDrawer } from './promotion-drawer';

function promotionStatus(p: PromotionDto): 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'PAUSED' {
  if (!p.isActive) return p.startsAt ? 'PAUSED' : 'DRAFT';
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'SCHEDULED';
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'EXPIRED';
  return 'ACTIVE';
}

const STATUS_CLS: Record<ReturnType<typeof promotionStatus>, string> = {
  DRAFT: 'bg-fg-subtle/[0.12] text-fg-muted',
  SCHEDULED: 'bg-info/[0.12] text-info',
  ACTIVE: 'bg-positive/[0.12] text-positive',
  EXPIRED: 'bg-fg-subtle/[0.10] text-fg-subtle',
  PAUSED: 'bg-warning/[0.12] text-warning',
};

function fmtValue(p: PromotionDto): string {
  switch (p.type) {
    case 'PERCENT':
      return p.value ? `${p.value}% off` : '—';
    case 'FIXED':
      return p.value ? `${formatMoney(p.value, 'USD')} off` : '—';
    case 'BOGO':
      return 'Buy-one-get-one';
    case 'FREE_DELIVERY':
      return 'Free delivery';
  }
}

function fmtWindow(p: PromotionDto): string {
  const s = p.startsAt ? new Date(p.startsAt).toLocaleDateString() : '—';
  const e = p.endsAt ? new Date(p.endsAt).toLocaleDateString() : '—';
  return `${s} → ${e}`;
}

export function PromotionsList({ initialPromotionId }: { initialPromotionId?: string }) {
  const { has } = usePermissions();
  const canWrite = has('promotion:write');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(initialPromotionId ?? null);

  const q = usePromotions();
  const rows = q.data ?? [];
  const fromList = rows.find((r) => r.id === selectedId) ?? null;
  // Deep-link fallback: if the id isn't in the list result, fetch it directly.
  const directFetch = usePromotion(selectedId && !fromList ? selectedId : null);
  const selected = fromList ?? directFetch.data ?? null;

  usePageHeader({
    title: 'Promotions',
    rightExtras: canWrite ? (
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Plus size={14} /> New promotion
      </Button>
    ) : null,
  });

  const columns = React.useMemo<ColumnDef<PromotionDto>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-fg">{row.original.name}</span>
            {row.original.description && (
              <span className="line-clamp-1 text-xs text-fg-subtle">
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="inline-flex h-5 items-center rounded-full bg-accent/[0.10] px-2 text-[11px] text-accent">
            {row.original.type}
          </span>
        ),
      },
      {
        id: 'value',
        header: 'Value',
        cell: ({ row }) => <span className="text-fg-muted">{fmtValue(row.original)}</span>,
      },
      {
        id: 'window',
        header: 'Window',
        cell: ({ row }) => (
          <span className="tabular-nums text-fg-muted">{fmtWindow(row.original)}</span>
        ),
      },
      {
        id: 'min',
        header: 'Min',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.minSubtotal ? (
            <span className="tabular-nums text-fg-muted">
              {formatMoney(row.original.minSubtotal, 'USD')}
            </span>
          ) : (
            <span className="text-fg-subtle">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = promotionStatus(row.original);
          return (
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${STATUS_CLS[s]}`}
            >
              {s}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (!has('promotion:read') && !canWrite) {
    return (
      <div className="grid place-items-center rounded-card border-hairline bg-surface p-12 text-sm text-fg-muted">
        You don't have permission to view promotions.
      </div>
    );
  }

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        onRowClick={(r) => setSelectedId(r.id)}
        emptyState={
          <div className="text-sm text-fg-muted">
            No promotions yet. Create one to start offering discounts.
          </div>
        }
      />
      <PromotionDrawer promotion={selected} onOpenChange={(o) => !o && setSelectedId(null)} />
      <CreatePromotionModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
