import type { NewOrderAlertSummary } from '@repo/jobs';

const TYPE_LABEL: Record<NewOrderAlertSummary['orderType'], string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DINE_IN: 'Dine-in',
};

/**
 * One-line owner alert reused by SMS and WhatsApp, e.g.
 * "New order R-2026-000123 · Delivery · 3 items · 84.50 PLN · Jan K."
 * Kept short so it fits a single SMS segment where possible.
 */
export function newOrderAlertText(summary: NewOrderAlertSummary): string {
  const parts = [
    `New order ${summary.orderNumber}`,
    TYPE_LABEL[summary.orderType],
    `${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'}`,
    `${summary.grandTotal} ${summary.currency}`,
  ];
  if (summary.customerName) parts.push(summary.customerName);
  return parts.join(' · ');
}

/** WhatsApp allows richer copy; include the manage link on its own line. */
export function newOrderWhatsappText(summary: NewOrderAlertSummary): string {
  return `${newOrderAlertText(summary)}\nManage: ${summary.adminUrl}`;
}
