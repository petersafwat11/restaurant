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

export function notificationCopyFor(
  status: OrderStatus,
  orderNumber: string,
): { title: string; body: string } {
  switch (status) {
    case 'PENDING':
      return {
        title: `Order ${orderNumber} placed`,
        body: 'We have your order — payment coming up.',
      };
    case 'CONFIRMED':
      return {
        title: `Order ${orderNumber} confirmed`,
        body: 'Payment received. We are getting your order ready.',
      };
    case 'PREPARING':
      return {
        title: `Order ${orderNumber} preparing`,
        body: 'The kitchen has started on your order.',
      };
    case 'READY':
      return {
        title: `Order ${orderNumber} ready`,
        body: 'Your order is ready for pickup.',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: `Order ${orderNumber} on the way`,
        body: 'Your order is out for delivery.',
      };
    case 'DELIVERED':
      return {
        title: `Order ${orderNumber} delivered`,
        body: 'Enjoy your meal!',
      };
    case 'COMPLETED':
      return {
        title: `Order ${orderNumber} completed`,
        body: 'Thanks for ordering with us.',
      };
    case 'CANCELLED':
      return {
        title: `Order ${orderNumber} cancelled`,
        body: 'Your order has been cancelled.',
      };
    case 'REFUNDED':
      return {
        title: `Order ${orderNumber} refunded`,
        body: 'A refund has been issued for your order.',
      };
    default:
      return { title: `Order ${orderNumber}`, body: '' };
  }
}
