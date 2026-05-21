import type { CustomerSummaryDto } from '@repo/types';
import type { ExportColumn } from '../common/table-export/columns';

const SEGMENT_LABEL: Record<string, string> = {
  vip: 'VIP',
  frequent: 'Frequent',
  dormant: 'Dormant',
  new: 'New',
  active: 'Active',
};

function fullName(r: CustomerSummaryDto): string {
  return [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
}

export const CUSTOMER_EXPORT_COLUMNS: readonly ExportColumn<CustomerSummaryDto>[] = [
  {
    header: 'Customer',
    csv: (r) => {
      const name = fullName(r);
      return name ? `${name} — ${r.email}` : r.email;
    },
    pdfWidth: '*',
  },
  {
    header: 'Phone',
    csv: (r) => r.phone ?? '',
    pdfWidth: 'auto',
  },
  {
    header: 'Orders',
    csv: (r) => String(r.lifetimeOrders),
    pdfWidth: 'auto',
  },
  {
    header: 'Lifetime spend',
    // CustomerSummaryDto doesn't carry currency, so we render the unformatted
    // amount. The UI shows currency-aware money in the table cell because it
    // joins the restaurant's currency at render time; an export of "all
    // customers" spans restaurants, so a single currency annotation would be
    // misleading. Leaving the raw amount is the honest choice.
    csv: (r) => r.lifetimeSpend,
    pdfWidth: 'auto',
  },
  {
    header: 'Last order',
    csv: (r) => r.lastOrderAt ?? '',
    pdf: (r) =>
      r.lastOrderAt
        ? r.lastOrderAt.replace('T', ' ').slice(0, 16)
        : '—',
    pdfWidth: 'auto',
  },
  {
    header: 'Segment',
    csv: (r) => (r.segment ? SEGMENT_LABEL[r.segment] ?? r.segment : ''),
    pdfWidth: 'auto',
  },
];

