import { z } from 'zod';

export const CUSTOMER_SEGMENTS = ['vip', 'frequent', 'dormant', 'new', 'active'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

const MoneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

export const CustomerSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  lifetimeOrders: z.number().int().min(0),
  lifetimeSpend: MoneyStringSchema,
  lastOrderAt: z.string().nullable(),
  firstOrderAt: z.string().nullable(),
  segment: z.enum(CUSTOMER_SEGMENTS).nullable(),
  createdAt: z.string(),
});
export type CustomerSummaryDto = z.infer<typeof CustomerSummarySchema>;

export const CustomerListSchema = z.object({
  items: z.array(CustomerSummarySchema),
  nextCursor: z.string().nullable(),
});
export type CustomerListDto = z.infer<typeof CustomerListSchema>;

export const CustomerNoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  byUserId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type CustomerNoteDto = z.infer<typeof CustomerNoteSchema>;

export const CustomerDetailSchema = CustomerSummarySchema.extend({
  addresses: z.array(
    z.object({
      id: z.string(),
      label: z.string().nullable(),
      line1: z.string(),
      city: z.string(),
    }),
  ),
  paymentMethods: z.array(
    z.object({
      id: z.string(),
      brand: z.string().nullable(),
      last4: z.string().nullable(),
    }),
  ),
  recentOrders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      status: z.string(),
      grandTotal: MoneyStringSchema,
      currency: z.string(),
      createdAt: z.string(),
    }),
  ),
  reviewCount: z.number().int().min(0),
  notes: z.array(CustomerNoteSchema),
});
export type CustomerDetailDto = z.infer<typeof CustomerDetailSchema>;

export const CustomerListQuerySchema = z.object({
  search: z.string().optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
  restaurantId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;

export const CreateCustomerNoteSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type CreateCustomerNoteDto = z.infer<typeof CreateCustomerNoteSchema>;
