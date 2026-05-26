'use client';

import type { OrderListItemDto, OrderStatus } from '@repo/types';
import {
  ColumnDef,
  ORDER_TRANSITIONS,
  RelativeTime,
  STATUS_TOKENS,
  StatusPill,
  TypeBadge,
  cn,
} from '@repo/ui';
import { elapsedMinutes, fmtPrep, formatMoney } from '@repo/utils';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface BuildColumnsArgs {
  onAdvance: (orderId: string, currentStatus: OrderStatus, to?: OrderStatus) => void;
}

export function useOrderColumns({ onAdvance }: BuildColumnsArgs): ColumnDef<OrderListItemDto>[] {
  const t = useTranslations('admin.orders.list');
  const tStatus = useTranslations('shared.orderStatus');

  const translatedTokens = React.useMemo(() => {
    const result = { ...STATUS_TOKENS };
    for (const key of Object.keys(STATUS_TOKENS) as OrderStatus[]) {
      result[key] = { ...STATUS_TOKENS[key], label: tStatus(key) };
    }
    return result;
  }, [tStatus]);

  return React.useMemo(
    () => {
      const typeLabels: Record<string, string> = {
        DELIVERY: t('filters.types.DELIVERY'),
        PICKUP: t('filters.types.PICKUP'),
        DINE_IN: t('filters.types.DINE_IN'),
      };

      return [
        {
          id: 'orderNumber',
          header: t('columns.orderNumber'),
          accessorKey: 'orderNumber',
          cell: (info) => (
            <span className="font-mono text-xs tracking-wide text-fg">{info.getValue<string>()}</span>
          ),
          size: 150,
        },
        {
          id: 'customer',
          header: t('columns.customer'),
          accessorKey: 'customerName',
          cell: (info) => {
            const name = info.getValue<string | null>() ?? t('columns.guest');
            const initials = name
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[11px] font-medium text-fg-muted">
                  {initials || '?'}
                </span>
                <span className="text-fg">{name}</span>
              </div>
            );
          },
          size: 200,
        },
        {
          id: 'items',
          header: t('columns.items'),
          accessorKey: 'itemCount',
          cell: (info) => {
            const n = info.getValue<number>();
            return (
              <span className="text-fg-muted">
                {t('columns.itemCount', { count: n })}
              </span>
            );
          },
          size: 110,
        },
        {
          id: 'type',
          header: t('columns.type'),
          accessorKey: 'type',
          cell: (info) => (
            <TypeBadge
              label={(typeLabels[info.getValue<string>()] ?? info.getValue<string>()).toUpperCase()}
            />
          ),
          size: 100,
        },
        {
          id: 'status',
          header: t('columns.status'),
          accessorKey: 'status',
          cell: (info) => {
            const status = info.getValue<OrderStatus>();
            const orderId = info.row.original.id;
            return (
              <StatusPill
                status={status}
                tokens={translatedTokens}
                transitions={ORDER_TRANSITIONS[status]}
                onTransition={(next) => onAdvance(orderId, status, next)}
              />
            );
          },
          size: 180,
        },
        {
          id: 'total',
          header: t('columns.total'),
          accessorFn: (r) => r.grandTotal,
          cell: (info) => (
            <span className="tabular-nums text-fg">
              {formatMoney(info.getValue<string>(), info.row.original.currency)}
            </span>
          ),
          enableSorting: true,
          meta: { align: 'right' as const },
          size: 100,
        },
        {
          id: 'placed',
          header: t('columns.placed'),
          accessorKey: 'createdAt',
          cell: (info) => (
            <span className="text-fg-subtle">
              <RelativeTime value={info.getValue<string>()} />
            </span>
          ),
          enableSorting: true,
          meta: { align: 'right' as const },
          size: 110,
        },
        {
          id: 'elapsed',
          header: t('columns.elapsed'),
          accessorKey: 'createdAt',
          cell: (info) => {
            const status = info.row.original.status;
            const active: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
            if (!active.includes(status)) return <span className="text-fg-subtle">—</span>;
            const mins = elapsedMinutes(info.getValue<string>());
            const cls = mins > 20 ? 'text-negative' : mins > 10 ? 'text-warning' : 'text-fg-muted';
            return <span className={cn('tabular-nums', cls)}>{fmtPrep(mins)}</span>;
          },
          meta: { align: 'right' as const },
          size: 80,
        },
      ];
    },
    [t, tStatus, translatedTokens, onAdvance],
  );
}
