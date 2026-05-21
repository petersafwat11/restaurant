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
import * as React from 'react';

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DINE_IN: 'Dine-in',
};

interface BuildColumnsArgs {
  onAdvance: (orderId: string, currentStatus: OrderStatus, to?: OrderStatus) => void;
  onView: (order: OrderListItemDto) => void;
}

export function buildOrderColumns({
  onAdvance,
  onView,
}: BuildColumnsArgs): ColumnDef<OrderListItemDto>[] {
  return [
    {
      id: 'orderNumber',
      header: 'Order #',
      accessorKey: 'orderNumber',
      cell: (info) => (
        <span className="font-mono text-xs tracking-wide text-fg">{info.getValue<string>()}</span>
      ),
      size: 150,
    },
    {
      id: 'customer',
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (info) => {
        const name = info.getValue<string | null>() ?? 'Guest';
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
      header: 'Items',
      accessorKey: 'itemCount',
      cell: (info) => {
        const n = info.getValue<number>();
        return (
          <span className="text-fg-muted">
            <span className="text-fg-subtle">{n} </span>
            {n === 1 ? 'item' : 'items'}
          </span>
        );
      },
      size: 110,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: (info) => (
        <TypeBadge
          label={(TYPE_LABEL[info.getValue<string>()] ?? info.getValue<string>()).toUpperCase()}
        />
      ),
      size: 100,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (info) => {
        const status = info.getValue<OrderStatus>();
        const orderId = info.row.original.id;
        return (
          <StatusPill
            status={status}
            tokens={STATUS_TOKENS}
            transitions={ORDER_TRANSITIONS[status]}
            onTransition={(next) => onAdvance(orderId, status, next)}
          />
        );
      },
      size: 180,
    },
    {
      id: 'total',
      header: 'Total',
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
      header: 'Placed',
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
      header: 'Elapsed',
      accessorKey: 'createdAt',
      cell: (info) => {
        const status = info.row.original.status;
        const active: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
        if (!active.includes(status)) return <span className="text-fg-subtle">—</span>;
        // Carry-over fix #6: ELAPSED is now - createdAt, monotonically ascending
        const mins = elapsedMinutes(info.getValue<string>());
        const cls = mins > 20 ? 'text-negative' : mins > 10 ? 'text-warning' : 'text-fg-muted';
        return <span className={cn('tabular-nums', cls)}>{fmtPrep(mins)}</span>;
      },
      meta: { align: 'right' as const },
      size: 80,
    },
  ];
}
