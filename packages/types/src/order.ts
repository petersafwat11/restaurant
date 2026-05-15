import { z } from 'zod';
import { PaymentSchema, RefundSchema } from './payment';

const MoneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Money must be a decimal string with ≤2dp');

export const ORDER_TYPES = ['DELIVERY', 'PICKUP', 'DINE_IN'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// ---- Order creation --------------------------------------------------------

export const CreateOrderSchema = z
  .object({
    restaurantId: z.string().min(1),
    sessionKey: z.string().min(1).optional(), // required for guests
    type: z.enum(ORDER_TYPES),
    deliveryAddressId: z.string().min(1).nullish(),
    pickupAt: z.string().datetime().nullish(),
    notes: z.string().max(1000).nullish(),
    tipAmount: MoneyStringSchema.default('0'),
  })
  .refine((d) => d.type !== 'DELIVERY' || !!d.deliveryAddressId, {
    message: 'deliveryAddressId is required for delivery orders',
    path: ['deliveryAddressId'],
  });
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

// ---- Order items snapshot --------------------------------------------------

export const OrderItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  nameSnapshot: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: MoneyStringSchema,
  lineTotal: MoneyStringSchema,
  modifierSnapshot: z.array(
    z.object({
      groupId: z.string(),
      groupName: z.string(),
      optionId: z.string(),
      optionName: z.string(),
      priceDelta: MoneyStringSchema,
    }),
  ),
  notes: z.string().nullable(),
});
export type OrderItemDto = z.infer<typeof OrderItemSchema>;

// ---- Status event ----------------------------------------------------------

export const OrderStatusEventSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.enum(ORDER_STATUSES),
  byUserId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderStatusEventDto = z.infer<typeof OrderStatusEventSchema>;

// ---- Admin-only enrichment (populated only for callers with order:read) ----

export const OrderCustomerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
});
export type OrderCustomerDto = z.infer<typeof OrderCustomerSchema>;

export const OrderPaymentSchema = PaymentSchema.extend({
  refunds: z.array(RefundSchema),
});
export type OrderPaymentDto = z.infer<typeof OrderPaymentSchema>;

// ---- Order detail ----------------------------------------------------------

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string().nullable(),
  restaurantId: z.string(),
  type: z.enum(ORDER_TYPES),
  status: z.enum(ORDER_STATUSES),
  subtotal: MoneyStringSchema,
  taxTotal: MoneyStringSchema,
  deliveryFee: MoneyStringSchema,
  tipAmount: MoneyStringSchema,
  discountTotal: MoneyStringSchema,
  grandTotal: MoneyStringSchema,
  currency: z.string(),
  deliveryAddress: z
    .object({
      line1: z.string(),
      line2: z.string().nullable(),
      city: z.string(),
      state: z.string().nullable(),
      zip: z.string().nullable(),
      country: z.string(),
    })
    .nullable(),
  pickupAt: z.string().nullable(),
  notes: z.string().nullable(),
  couponCode: z.string().nullable(),
  items: z.array(OrderItemSchema),
  statusEvents: z.array(OrderStatusEventSchema),
  // Admin-only: present when the caller has `order:read` (staff view).
  // Self/customer view leaves these null — the user already has their data.
  customer: OrderCustomerSchema.nullable().optional(),
  payment: OrderPaymentSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderDto = z.infer<typeof OrderSchema>;

// ---- Order list summary ----------------------------------------------------

export const OrderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  restaurantId: z.string(),
  status: z.enum(ORDER_STATUSES),
  type: z.enum(ORDER_TYPES),
  grandTotal: MoneyStringSchema,
  currency: z.string(),
  itemCount: z.number().int().min(0),
  customerName: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderListItemDto = z.infer<typeof OrderListItemSchema>;

export const OrderListSchema = z.object({
  items: z.array(OrderListItemSchema),
  nextCursor: z.string().nullable(),
});
export type OrderListDto = z.infer<typeof OrderListSchema>;

// ---- Query params ----------------------------------------------------------

export const OrderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  // Admin-list filters — only honored when the caller has `order:read`
  // and supplies `restaurantId`. Customer callers ignore these.
  restaurantId: z.string().min(1).optional(),
  type: z.enum(ORDER_TYPES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;
