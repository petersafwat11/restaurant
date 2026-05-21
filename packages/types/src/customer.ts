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
  search: z.string().max(100).optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;

// Admin customers export — same filter surface as CustomerListQuery minus
// pagination, plus a `format` selector.
export const CustomerExportQuerySchema = z.object({
  search: z.string().max(100).optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
  format: z.enum(['csv', 'pdf']).default('csv'),
});
export type CustomerExportQuery = z.infer<typeof CustomerExportQuerySchema>;

export const CreateCustomerNoteSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type CreateCustomerNoteDto = z.infer<typeof CreateCustomerNoteSchema>;

// ---- Customer tags --------------------------------------------------------

export const CustomerTagSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  color: z.string().nullable(),
  createdAt: z.string(),
});
export type CustomerTagDto = z.infer<typeof CustomerTagSchema>;

export const CustomerTagListSchema = z.array(CustomerTagSchema);

export const CreateCustomerTagSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/i, 'Slug must be alphanumeric or hyphenated'),
  label: z.string().min(1).max(80),
  color: z.string().max(20).optional(),
});
export type CreateCustomerTagDto = z.infer<typeof CreateCustomerTagSchema>;

export const BulkTagCustomersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(500),
  tagId: z.string().min(1),
  action: z.enum(['ADD', 'REMOVE']).default('ADD'),
});
export type BulkTagCustomersDto = z.infer<typeof BulkTagCustomersSchema>;

export const BulkTagCustomersResponseSchema = z.object({
  affected: z.number().int().min(0),
});
export type BulkTagCustomersResponseDto = z.infer<typeof BulkTagCustomersResponseSchema>;

// ---- Customer broadcast email --------------------------------------------

export const BroadcastEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  userIds: z.array(z.string().min(1)).min(1).max(5000).optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
});
export type BroadcastEmailDto = z.infer<typeof BroadcastEmailSchema>;

export const BroadcastEmailResponseSchema = z.object({
  queued: z.number().int().min(0),
  campaignId: z.string(),
});
export type BroadcastEmailResponseDto = z.infer<typeof BroadcastEmailResponseSchema>;
