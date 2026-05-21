import { formatMoney } from '@repo/utils';
import type { ExportColumn } from '../common/table-export/columns';

/**
 * Row shape produced by `OrdersService.exportList()`. Joins enough of the
 * Order + User relation to render every UI column without further lookups.
 */
export type OrderExportRow = {
  orderNumber: string;
  type: string;
  status: string;
  grandTotal: { toString(): string };
  currency: string;
  itemCount: number;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: Date;
};

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DINE_IN: 'Dine-in',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ORDER_EXPORT_COLUMNS: readonly ExportColumn<OrderExportRow>[] = [
  {
    header: 'Order #',
    csv: (r) => r.orderNumber,
    pdfWidth: 'auto',
  },
  {
    header: 'Customer',
    csv: (r) =>
      [r.customerName, r.customerEmail].filter(Boolean).join(' — ') || '',
    pdfWidth: '*',
  },
  {
    header: 'Items',
    csv: (r) => String(r.itemCount),
    pdfWidth: 'auto',
  },
  {
    header: 'Type',
    csv: (r) => TYPE_LABEL[r.type] ?? r.type,
    pdfWidth: 'auto',
  },
  {
    header: 'Status',
    csv: (r) => STATUS_LABEL[r.status] ?? r.status,
    pdfWidth: 'auto',
  },
  {
    header: 'Total',
    csv: (r) => formatMoney(r.grandTotal.toString(), r.currency),
    pdfWidth: 'auto',
  },
  {
    header: 'Placed',
    csv: (r) => r.createdAt.toISOString(),
    pdf: (r) => r.createdAt.toISOString().replace('T', ' ').slice(0, 16),
    pdfWidth: 'auto',
  },
];
