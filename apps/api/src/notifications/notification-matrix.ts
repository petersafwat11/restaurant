import { type Locale, createTranslator } from '@repo/i18n';
import type { OrderStatus } from '@repo/types';

/**
 * Per-status channel matrix — mirrors §9 of the project plan.
 * `inApp` always fires for the customer (so they see it in the in-app feed).
 */
export interface ChannelSet {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
}

const NONE: ChannelSet = { email: false, sms: false, push: false, inApp: false };

export const ORDER_STATUS_CHANNELS: Partial<Record<OrderStatus, ChannelSet>> = {
  // PENDING is the order-placed event, dispatched from order.created
  PENDING: { email: true, sms: false, push: true, inApp: true },
  CONFIRMED: { email: false, sms: true, push: true, inApp: true },
  OUT_FOR_DELIVERY: { email: false, sms: true, push: true, inApp: true },
  DELIVERED: { email: false, sms: false, push: true, inApp: true },
  COMPLETED: NONE,
  CANCELLED: { email: true, sms: false, push: true, inApp: true },
  REFUNDED: { email: true, sms: false, push: true, inApp: true },
};

export function channelsForStatus(status: OrderStatus): ChannelSet {
  return ORDER_STATUS_CHANNELS[status] ?? NONE;
}

// Statuses whose body has a localized catalog entry under `order.notify.*`.
const NOTIFY_KEY: Partial<Record<OrderStatus, string>> = {
  PENDING: 'order.notify.placed',
  CONFIRMED: 'order.notify.confirmed',
  READY: 'order.notify.ready',
  OUT_FOR_DELIVERY: 'order.notify.outForDelivery',
  DELIVERED: 'order.notify.delivered',
  CANCELLED: 'order.notify.cancelled',
  REFUNDED: 'order.notify.refunded',
};

/**
 * Localized copy for the in-app feed (and any transport that reuses it).
 * Title = "Order {n}" + status label; body = the per-status catalog line,
 * falling back to the status label for statuses without a notify line
 * (e.g. PREPARING / COMPLETED). Locale comes from the recipient's
 * `User.locale`; defaults to English so existing behaviour is unchanged.
 */
export function notificationCopyFor(
  status: OrderStatus,
  orderNumber: string,
  locale: Locale = 'en',
): { title: string; body: string } {
  const t = createTranslator(locale);
  const statusLabel = t(`order.status.${status}` as never);
  const title = `${t('order.title', { number: orderNumber })} — ${statusLabel}`;
  const key = NOTIFY_KEY[status];
  const body = key ? t(key as never, { number: orderNumber }) : statusLabel;
  return { title, body };
}
