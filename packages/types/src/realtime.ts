import { z } from 'zod';
import { ORDER_STATUSES, ORDER_TYPES } from './order';

export const REALTIME_EVENT_NAMES = [
  'order.created',
  'order.status_changed',
  'order.cancelled',
  'order.refunded',
  'kitchen.ticket_added',
  'kitchen.ticket_removed',
] as const;
export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number];

// ---- Event payloads --------------------------------------------------------

export const OrderCreatedEventSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  restaurantId: z.string(),
  userId: z.string().nullable(),
  status: z.enum(ORDER_STATUSES),
  type: z.enum(ORDER_TYPES),
  grandTotal: z.string(),
  currency: z.string(),
  itemCount: z.number().int().min(0),
  customerName: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;

export const OrderStatusChangedEventSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  restaurantId: z.string(),
  userId: z.string().nullable(),
  from: z.enum(ORDER_STATUSES),
  to: z.enum(ORDER_STATUSES),
  type: z.enum(ORDER_TYPES),
  grandTotal: z.string(),
  currency: z.string(),
  itemCount: z.number().int().min(0),
  customerName: z.string().nullable(),
  note: z.string().nullable(),
  changedAt: z.string(),
});
export type OrderStatusChangedEvent = z.infer<typeof OrderStatusChangedEventSchema>;

export const OrderCancelledEventSchema = OrderStatusChangedEventSchema;
export type OrderCancelledEvent = z.infer<typeof OrderCancelledEventSchema>;

export const OrderRefundedEventSchema = OrderStatusChangedEventSchema.extend({
  refundAmount: z.string(),
});
export type OrderRefundedEvent = z.infer<typeof OrderRefundedEventSchema>;

export const KitchenTicketEventSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  restaurantId: z.string(),
  status: z.enum(ORDER_STATUSES),
  itemCount: z.number().int().min(0),
});
export type KitchenTicketEvent = z.infer<typeof KitchenTicketEventSchema>;

// ---- Subscribe wire format -------------------------------------------------

export const SubscribeMessageSchema = z.object({
  room: z.string().min(1),
});
export type SubscribeMessage = z.infer<typeof SubscribeMessageSchema>;

export const SubscribeAckSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), room: z.string() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);
export type SubscribeAck = z.infer<typeof SubscribeAckSchema>;

// ---- Status update body ----------------------------------------------------

export const UpdateOrderStatusSchema = z.object({
  to: z.enum(ORDER_STATUSES),
  note: z.string().max(1000).nullish(),
  reason: z.string().max(1000).nullish(),
});
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;

// ---- Kitchen tickets ------------------------------------------------------

export const KitchenTicketSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.enum(ORDER_STATUSES),
  confirmedAt: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().min(1),
      modifiers: z.array(z.string()),
      notes: z.string().nullable(),
    }),
  ),
});
export type KitchenTicketDto = z.infer<typeof KitchenTicketSchema>;

export const KitchenTicketsListSchema = z.array(KitchenTicketSchema);

// ---- Room name helpers (string constants for both client + server) -------

export const ROOMS = {
  order: (orderId: string) => `order:${orderId}`,
  restaurantOrders: (restaurantId: string) => `restaurant:${restaurantId}:orders`,
  restaurantKitchen: (restaurantId: string) => `restaurant:${restaurantId}:kitchen`,
};
