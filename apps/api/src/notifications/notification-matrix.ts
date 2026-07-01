import type { I18nService } from 'nestjs-i18n';
import type { OrderStatus } from '@repo/types';

export type Locale = 'pl' | 'en';

/**
 * Per-status channel matrix — mirrors §9 of the project plan.
 * `inApp` always fires for the customer (so they see it in the in-app feed).
 * (Slice 10: the push channel was removed; only email + SMS + in-app remain.)
 */
export interface ChannelSet {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

const NONE: ChannelSet = { email: false, sms: false, inApp: false };

export const ORDER_STATUS_CHANNELS: Partial<Record<OrderStatus, ChannelSet>> = {
  PENDING: { email: true, sms: false, inApp: true },
  CONFIRMED: { email: false, sms: true, inApp: true },
  OUT_FOR_DELIVERY: { email: false, sms: true, inApp: true },
  DELIVERED: { email: false, sms: false, inApp: true },
  COMPLETED: NONE,
  CANCELLED: { email: true, sms: false, inApp: true },
  REFUNDED: { email: true, sms: false, inApp: true },
};

export function channelsForStatus(status: OrderStatus): ChannelSet {
  return ORDER_STATUS_CHANNELS[status] ?? NONE;
}

// nestjs-i18n derives the namespace segment from the JSON *filename*, so these
// reference the kebab files directly: `shared/order-notify.json` → `shared.order-notify`.
// The frontend reaches the same catalogs as `shared.orderNotify` because @repo/i18n's
// messages.ts maps each kebab file to a camelCase key — the API has no such mapping layer.
const NOTIFY_KEY: Partial<Record<OrderStatus, string>> = {
  PENDING: 'shared.order-notify.placed',
  CONFIRMED: 'shared.order-notify.confirmed',
  READY: 'shared.order-notify.ready',
  OUT_FOR_DELIVERY: 'shared.order-notify.outForDelivery',
  DELIVERED: 'shared.order-notify.delivered',
  CANCELLED: 'shared.order-notify.cancelled',
  REFUNDED: 'shared.order-notify.refunded',
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
  const statusLabel = i18n.t(`shared.order-status.${status}`, { lang: locale }) as string;
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
