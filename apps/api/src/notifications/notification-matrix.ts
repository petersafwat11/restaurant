import type { I18nService } from 'nestjs-i18n';
import type { OrderStatus } from '@repo/types';

export type Locale = 'pl' | 'en';

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

// Statuses whose body has a localized catalog entry under `shared.orderNotify.*`.
const NOTIFY_KEY: Partial<Record<OrderStatus, string>> = {
  PENDING: 'shared.orderNotify.placed',
  CONFIRMED: 'shared.orderNotify.confirmed',
  READY: 'shared.orderNotify.ready',
  OUT_FOR_DELIVERY: 'shared.orderNotify.outForDelivery',
  DELIVERED: 'shared.orderNotify.delivered',
  CANCELLED: 'shared.orderNotify.cancelled',
  REFUNDED: 'shared.orderNotify.refunded',
};

/**
 * Localized copy for the in-app feed (and any transport that reuses it).
 * Title = "Order {n}" + status label; body = the per-status catalog line,
 * falling back to the status label for statuses without a notify line.
 */
export function notificationCopyFor(
  i18n: I18nService,
  status: OrderStatus,
  orderNumber: string,
  locale: Locale = 'pl',
): { title: string; body: string } {
  const statusLabel = i18n.t(`shared.orderStatus.${status}`, { lang: locale }) as string;
  const orderTitle = i18n.t('shared.order.title', {
    lang: locale,
    args: { number: orderNumber },
  }) as string;
  const title = `${orderTitle} — ${statusLabel}`;

  const key = NOTIFY_KEY[status];
  const body = key
    ? (i18n.t(key, { lang: locale, args: { number: orderNumber } }) as string)
    : statusLabel;

  return { title, body };
}
