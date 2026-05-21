'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { usePromotion, usePromotions } from '@/features/promotions/hooks';
import type { PromotionDto } from '@repo/types';
import { Button, type ColumnDef, DataTable } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { CreatePromotionModal } from './create-promotion-modal';
import { PromotionDrawer } from './promotion-drawer';

type PromotionStatusKey = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'PAUSED';

function promotionStatus(p: PromotionDto): PromotionStatusKey {
  if (!p.isActive) return p.startsAt ? 'PAUSED' : 'DRAFT';
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'SCHEDULED';
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return 'EXPIRED';
  return 'ACTIVE';
}

const STATUS_CLS: Record<PromotionStatusKey, string> = {
  DRAFT: 'bg-fg-subtle/[0.12] text-fg-muted',
  SCHEDULED: 'bg-info/[0.12] text-info',
  ACTIVE: 'bg-positive/[0.12] text-positive',
  EXPIRED: 'bg-fg-subtle/[0.10] text-fg-subtle',
  PAUSED: 'bg-warning/[0.12] text-warning',
};

export function PromotionsList({ initialPromotionId }: { initialPromotionId?: string }) {
  const t = useTranslations('admin.promotions.list');
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
    title: t('title'),
    rightExtras: canWrite ? (
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Plus size={14} /> {t('newPromotion')}
      </Button>
    ) : null,
  });

  function fmtValue(p: PromotionDto): string {
    switch (p.type) {
      case 'PERCENT':
        return p.value ? t('value.percentOff', { value: p.value }) : t('value.none');
      case 'FIXED':
        return p.value
          ? t('value.fixedOff', { amount: formatMoney(p.value, 'USD') })
          : t('value.none');
      case 'BOGO':
        return t('value.bogo');
      case 'FREE_DELIVERY':
        return t('value.freeDelivery');
    }
  }

  function fmtWindow(p: PromotionDto): string {
    const s = p.startsAt ? new Date(p.startsAt).toLocaleDateString() : t('window.none');
    const e = p.endsAt ? new Date(p.endsAt).toLocaleDateString() : t('window.none');
    return t('window.range', { start: s, end: e });
  }

  const columns = React.useMemo<ColumnDef<PromotionDto>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
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
        header: t('columns.type'),
        cell: ({ row }) => (
          <span className="inline-flex h-5 items-center rounded-full bg-accent/[0.10] px-2 text-[11px] text-accent">
            {t(`types.${row.original.type}`)}
          </span>
        ),
      },
      {
        id: 'value',
        header: t('columns.value'),
        cell: ({ row }) => <span className="text-fg-muted">{fmtValue(row.original)}</span>,
      },
      {
        id: 'window',
        header: t('columns.window'),
        cell: ({ row }) => (
          <span className="tabular-nums text-fg-muted">{fmtWindow(row.original)}</span>
        ),
      },
      {
        id: 'min',
        header: t('columns.min'),
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.minSubtotal ? (
            <span className="tabular-nums text-fg-muted">
              {formatMoney(row.original.minSubtotal, 'USD')}
            </span>
          ) : (
            <span className="text-fg-subtle">{t('value.none')}</span>
          ),
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          const s = promotionStatus(row.original);
          return (
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${STATUS_CLS[s]}`}
            >
              {t(`status.${s}`)}
            </span>
          );
        },
      },
    ],
    [t],
  );

  if (!has('promotion:read') && !canWrite) {
    return (
      <div className="grid place-items-center rounded-card border-hairline bg-surface p-12 text-sm text-fg-muted">
        {t('noPermission')}
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
        emptyState={<div className="text-sm text-fg-muted">{t('empty')}</div>}
      />
      <PromotionDrawer promotion={selected} onOpenChange={(o) => !o && setSelectedId(null)} />
      <CreatePromotionModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
