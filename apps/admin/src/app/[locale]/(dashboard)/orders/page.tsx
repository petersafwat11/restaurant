'use client';

import { KeyboardShortcuts, ORDERS_SHORTCUT_GROUPS } from '@/components/keyboard-shortcuts';
import { usePageHeader } from '@/components/shell/page-title-context';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  CancelModal,
  LivePulseChip,
  OrderDetailDrawer,
  OrdersFilters,
  type OrdersFiltersState,
  RefundModal,
  SoundToggle,
  buildOrderColumns,
} from '@/features/orders/components';
import {
  type AdminOrderFilters,
  useAdminOrders,
  useAdvanceOrder,
  useExportOrders,
  useLiveAdminOrders,
  useOrderChime,
  useOrderNotifications,
} from '@/features/orders/hooks';
import { getApiClient } from '@/lib/api-client';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { OrderListItemDto, OrderStatus, RestaurantPublicDto } from '@repo/types';
import {
  ActionModal,
  type BulkAction,
  BulkActionBar,
  Button,
  DataTable,
  type DataTableRowDecorator,
  type DataTableSelectionState,
  type DataTableSortState,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
} from '@repo/ui';
import { elapsedMinutes, formatMoney, sumMoneyStrings } from '@repo/utils';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const DEFAULT_FILTERS: OrdersFiltersState = {
  status: 'all',
  types: [],
  payments: [],
  search: '',
  sort: 'newest',
};

export default function OrdersPage() {
  const t = useTranslations('admin.orders.list');
  const [filters, setFilters] = React.useState<OrdersFiltersState>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageSize = 25;
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [focusedKey, setFocusedKey] = React.useState<string | undefined>();
  const [drawerOrderId, setDrawerOrderId] = React.useState<string | null>(null);
  const [refundOrderId, setRefundOrderId] = React.useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = React.useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [confirmBulkAdvance, setConfirmBulkAdvance] = React.useState(false);
  const { has } = usePermissions();
  const canAdvanceStatus = has('order:status_update');
  const restaurantQuery = useQuery<RestaurantPublicDto>({
    queryKey: ['restaurant', 'public'],
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60_000,
  });
  const restaurantName = restaurantQuery.data?.name ?? null;

  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPageIndex(0);
  }, [filters.status, filters.types, filters.payments, debouncedSearch, filters.sort]);

  const queryFilters: AdminOrderFilters = React.useMemo(
    () => ({
      status: filters.status === 'all' ? undefined : (filters.status as OrderStatus),
      type: filters.types[0],
      search: debouncedSearch || undefined,
      limit: pageSize,
    }),
    [filters.status, filters.types, debouncedSearch],
  );

  const ordersQuery = useAdminOrders(queryFilters);
  const { newCount, resetNewCount } = useLiveAdminOrders(queryFilters);
  const { muted, setMuted } = useOrderChime(newCount);
  useOrderNotifications({ trigger: newCount, restaurantName });
  const advance = useAdvanceOrder();
  const exportOrders = useExportOrders();

  const onExport = React.useCallback(
    (format: 'csv' | 'pdf') => {
      exportOrders.mutate({
        status: filters.status === 'all' ? undefined : (filters.status as OrderStatus),
        type: filters.types[0],
        search: debouncedSearch || undefined,
        format,
      });
    },
    [exportOrders, filters.status, filters.types, debouncedSearch],
  );

  const rows: OrderListItemDto[] = ordersQuery.data?.items ?? [];

  const filteredRows = React.useMemo(() => {
    let f = rows;
    if (filters.types.length > 1) f = f.filter((r) => filters.types.includes(r.type));
    return sortRows(f, filters.sort);
  }, [rows, filters.types, filters.sort]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c as Record<'all' | OrderStatus, number>;
  }, [rows]);

  const selectedRows = React.useMemo(
    () => filteredRows.filter((r) => selected.has(r.id)),
    [filteredRows, selected],
  );
  const selectedTotal = sumMoneyStrings(selectedRows.map((r) => r.grandTotal));
  const sameStatus =
    selectedRows.length > 0 && new Set(selectedRows.map((r) => r.status)).size === 1;
  const currency = rows[0]?.currency ?? 'USD';

  usePageHeader({
    title: t('title'),
    rightExtras: <SoundToggle muted={muted} onToggle={() => setMuted(!muted)} />,
  });

  const onAdvance = React.useCallback(
    (orderId: string, currentStatus: OrderStatus, to?: OrderStatus) => {
      advance.mutate({ orderId, currentStatus, to });
    },
    [advance],
  );

  const columns = React.useMemo(
    () =>
      buildOrderColumns({
        onAdvance,
        onView: (o) => setDrawerOrderId(o.id),
      }),
    [onAdvance],
  );

  const selection: DataTableSelectionState<string> = { selected, onChange: setSelected };
  const [sort, setSort] = React.useState<DataTableSortState | null>(null);

  const rowDecorator = React.useCallback(
    (row: OrderListItemDto): DataTableRowDecorator | undefined => {
      if (elapsedMinutes(row.createdAt) < 0.5) {
        return { borderInsetClass: 'shadow-[inset_2px_0_0_rgb(var(--accent))]' };
      }
      if (row.status === 'PENDING' && elapsedMinutes(row.createdAt) > 2) {
        return { borderInsetClass: 'shadow-[inset_2px_0_0_rgb(var(--negative))]' };
      }
      return undefined;
    },
    [],
  );

  function runBulkAdvance() {
    for (const r of selectedRows) onAdvance(r.id, r.status);
    setSelected(new Set());
    setConfirmBulkAdvance(false);
  }

  const bulkActions: BulkAction[] = React.useMemo(() => {
    const actions: BulkAction[] = [];
    if (sameStatus && selectedRows[0] && canAdvanceStatus) {
      actions.push({
        id: 'advance',
        label: t('bulk.advance'),
        icon: ArrowRight,
        onClick: () => {
          if (selectedRows.length > 1) setConfirmBulkAdvance(true);
          else {
            for (const r of selectedRows) onAdvance(r.id, r.status);
            setSelected(new Set());
          }
        },
      });
    }
    actions.push({
      id: 'cancel',
      label: t('bulk.cancel'),
      icon: X,
      tone: 'destructive',
      disabled: selectedRows.length !== 1,
      tooltip: selectedRows.length === 1 ? undefined : t('bulk.cancelOneTooltip'),
      onClick: () => selectedRows[0] && setCancelOrderId(selectedRows[0].id),
    });
    return actions;
  }, [sameStatus, selectedRows, onAdvance, canAdvanceStatus, t]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? '';
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (inField && e.key !== 'Escape') return;

      if (!inField && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'f'))) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (!inField && e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (!inField && /^[1-8]$/.test(e.key)) {
        const map = [
          'all',
          'PENDING',
          'CONFIRMED',
          'PREPARING',
          'READY',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
        ] as const;
        const next = map[Number(e.key) - 1];
        if (next) setFilters((f) => ({ ...f, status: next }));
        return;
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const next = new Set(selected);
        for (const r of filteredRows) next.add(r.id);
        setSelected(next);
        return;
      }
      if (
        !inField &&
        (e.key === 'j' || e.key === 'k' || e.key === 'ArrowDown' || e.key === 'ArrowUp')
      ) {
        e.preventDefault();
        const ids = filteredRows.map((r) => r.id);
        const cur = focusedKey ? ids.indexOf(focusedKey) : -1;
        const delta = e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(ids.length - 1, cur + delta));
        setFocusedKey(ids[nextIdx]);
        return;
      }
      if (!inField && e.key === 'Enter' && focusedKey) {
        setDrawerOrderId(focusedKey);
        return;
      }
      if (!inField && e.key === ' ' && focusedKey) {
        e.preventDefault();
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(focusedKey)) next.delete(focusedKey);
          else next.add(focusedKey);
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredRows, focusedKey, selected]);

  return (
    <>
      <PageHeader
        rows={[
          <div key="row1" className="flex w-full items-center gap-3">
            <LivePulseChip count={newCount} onClick={resetNewCount} />
            <OrdersFilters
              value={filters}
              onChange={setFilters}
              counts={counts}
              searchRef={searchRef}
            />
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exportOrders.isPending || rows.length === 0}
                    aria-label={t('exportAriaLabel')}
                  >
                    {exportOrders.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {t('exportButton')}
                    <ChevronDown size={12} className="opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExport('csv')}>
                    <FileSpreadsheet size={14} /> {t('exportCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')}>
                    <FileText size={14} /> {t('exportPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>,
        ]}
        bulk={
          <BulkActionBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            actions={bulkActions}
            meta={
              selected.size > 0
                ? t('bulk.selectedMoney', { amount: formatMoney(selectedTotal, currency) })
                : null
            }
          />
        }
      />

      <DataTable
        data={filteredRows}
        columns={columns}
        rowKey={(r) => r.id}
        selection={selection}
        sort={{ state: sort, onChange: setSort }}
        onRowClick={(r) => setDrawerOrderId(r.id)}
        rowDecorator={rowDecorator}
        focusedKey={focusedKey}
        onFocusChange={(k) => setFocusedKey(k)}
        loading={ordersQuery.isLoading}
        emptyState={
          <div>
            <div className="text-sm text-fg-muted">
              {filters.status === 'all' && !debouncedSearch && filters.types.length === 0
                ? t('empty.all')
                : t('empty.filtered')}
            </div>
            {(filters.status !== 'all' || debouncedSearch || filters.types.length > 0) && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-3 inline-flex items-center rounded-md bg-surface-2 px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
              >
                {t('empty.clearFilters')}
              </button>
            )}
          </div>
        }
        pagination={{
          pageIndex,
          pageSize,
          total:
            (ordersQuery.data?.items.length ?? 0) + (ordersQuery.data?.nextCursor ? pageSize : 0),
          onPageChange: setPageIndex,
        }}
      />

      <OrderDetailDrawer
        orderId={drawerOrderId}
        onOpenChange={(o) => !o && setDrawerOrderId(null)}
        onRefund={(id) => setRefundOrderId(id)}
        onCancel={(id) => setCancelOrderId(id)}
      />
      <RefundModal orderId={refundOrderId} onOpenChange={(o) => !o && setRefundOrderId(null)} />
      <CancelModal orderId={cancelOrderId} onOpenChange={(o) => !o && setCancelOrderId(null)} />
      <KeyboardShortcuts
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        groups={ORDERS_SHORTCUT_GROUPS}
      />
      <ActionModal
        open={confirmBulkAdvance}
        onOpenChange={setConfirmBulkAdvance}
        title={t('confirmBulkAdvance.title', { count: selectedRows.length })}
        description={t('confirmBulkAdvance.description')}
        primary={{
          label: t('confirmBulkAdvance.primary', { count: selectedRows.length }),
          onClick: runBulkAdvance,
        }}
        secondary={{
          label: t('confirmBulkAdvance.secondary'),
          onClick: () => setConfirmBulkAdvance(false),
        }}
      />
    </>
  );
}

function sortRows(
  rows: OrderListItemDto[],
  sort: 'newest' | 'oldest' | 'total-desc' | 'wait-desc',
): OrderListItemDto[] {
  const copy = [...rows];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest':
      return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'total-desc':
      return copy.sort((a, b) => Number(b.grandTotal) - Number(a.grandTotal));
    case 'wait-desc':
      return copy.sort((a, b) => elapsedMinutes(a.createdAt) - elapsedMinutes(b.createdAt));
    default:
      return copy;
  }
}
