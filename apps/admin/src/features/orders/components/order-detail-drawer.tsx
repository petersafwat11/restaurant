'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useAdvanceOrder, useOrder } from '@/features/orders/hooks';
import type { OrderStatus } from '@repo/types';
import {
  Button,
  DetailDrawer,
  ORDER_TRANSITIONS,
  RelativeTime,
  STATUS_TOKENS,
  Spinner,
  StatusPill,
  TypeBadge,
} from '@repo/ui';
import { AlertCircle, ArrowRight, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { OrderDrawerBody } from './order-drawer-body';

interface OrderDetailDrawerProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onCancel: (orderId: string) => void;
  onRefund: (orderId: string) => void;
}

export function OrderDetailDrawer({
  orderId,
  onOpenChange,
  onCancel,
  onRefund,
}: OrderDetailDrawerProps) {
  const t = useTranslations('admin.orders.detail');
  const tStatus = useTranslations('shared.orderStatus');
  const tTypes = useTranslations('admin.orders.detail.types');

  const translatedTokens = React.useMemo(() => {
    const result = { ...STATUS_TOKENS };
    for (const key of Object.keys(STATUS_TOKENS) as OrderStatus[]) {
      result[key] = { ...STATUS_TOKENS[key], label: tStatus(key) };
    }
    return result;
  }, [tStatus]);

  const q = useOrder(orderId ?? '');
  const advance = useAdvanceOrder();
  const { has } = usePermissions();
  const order = q.data;
  const open = orderId !== null;
  const canAdvance = has('order:status_update');
  const canRefund = has('order:refund') || has('payment:refund');
  const canCancel = has('order:cancel');

  const nextStatus: OrderStatus | undefined = order
    ? ORDER_TRANSITIONS[order.status]?.find((s) => s !== 'CANCELLED')
    : undefined;
  const isTerminal = order ? ['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(order.status) : false;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={540}
      ariaLabel={t('drawer.ariaLabel')}
      flushBody
      header={
        order ? (
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-h2-admin tracking-wide text-fg">
                  {order.orderNumber}
                </h2>
                <TypeBadge label={tTypes(order.type as 'DELIVERY' | 'PICKUP' | 'DINE_IN').toUpperCase()} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
              {order.customer?.name && <span>{order.customer.name}</span>}
              {order.customer?.phone && (
                <>
                  <span className="text-fg-subtle">·</span>
                  <span className="tabular-nums">{order.customer.phone}</span>
                </>
              )}
              <span className="text-fg-subtle">·</span>
              <RelativeTime value={order.createdAt} />
            </div>
            <div className="mt-3">
              <StatusPill status={order.status} tokens={translatedTokens} />
            </div>
          </div>
        ) : (
          <div className="flex items-center px-6 py-4">
            <Spinner size="sm" tone="muted" />
          </div>
        )
      }
      footer={
        order && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="flex-1 min-w-[10rem]"
              disabled={!nextStatus || !canAdvance || advance.isPending}
              title={!canAdvance ? t('noPermissionAdvanceLong') : undefined}
              onClick={() =>
                nextStatus &&
                advance.mutate({ orderId: order.id, currentStatus: order.status, to: nextStatus })
              }
            >
              {nextStatus ? (
                <>
                  {t('advanceTo', { status: tStatus(nextStatus) })}
                  <ArrowRight size={14} />
                </>
              ) : isTerminal ? (
                t('orderComplete')
              ) : (
                t('noNextState')
              )}
            </Button>
            {!isTerminal && canRefund && (
              <Button variant="ghost" onClick={() => onRefund(order.id)}>
                {t('refund')}
              </Button>
            )}
            {!isTerminal && canCancel && (
              <Button
                variant="ghost"
                onClick={() => onCancel(order.id)}
                className="text-negative hover:text-negative"
              >
                {t('cancel')}
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label={t('print')}>
              <Printer size={14} />
            </Button>
          </div>
        )
      }
    >
      {q.isLoading && (
        <div className="flex items-center justify-center px-6 py-16">
          <Spinner size="lg" />
        </div>
      )}
      {q.isError && !order && (
        <div className="px-6 py-6">
          <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-3 text-small-admin text-negative">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">{t('drawer.loadError')}</div>
              <div className="mt-1 break-words text-xs opacity-90">
                {(q.error as Error | null)?.message ?? t('drawer.unknownError')}
              </div>
              <button
                type="button"
                onClick={() => q.refetch()}
                className="mt-2 inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
              >
                {t('drawer.retry')}
              </button>
            </div>
          </div>
        </div>
      )}
      {order && <OrderDrawerBody order={order} />}
    </DetailDrawer>
  );
}
