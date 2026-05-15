import { z } from 'zod';

export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CreateContactMessageSchema = z.object({
  restaurantId: z.string().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().max(160).optional(),
  message: z.string().min(1).max(5000),
});
export type CreateContactMessageDto = z.infer<typeof CreateContactMessageSchema>;

export const ContactMessageSchema = z.object({
  id: z.string(),
  restaurantId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  subject: z.string().nullable(),
  message: z.string(),
  status: z.enum(CONTACT_STATUSES),
  handledByUserId: z.string().nullable(),
  handledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ContactMessageDto = z.infer<typeof ContactMessageSchema>;

export const ContactMessageListSchema = z.object({
  items: z.array(ContactMessageSchema),
  nextCursor: z.string().nullable(),
});
export type ContactMessageListDto = z.infer<typeof ContactMessageListSchema>;

export const ContactMessageListQuerySchema = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  restaurantId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ContactMessageListQuery = z.infer<typeof ContactMessageListQuerySchema>;

export const UpdateContactMessageSchema = z.object({
  status: z.enum(CONTACT_STATUSES),
});
export type UpdateContactMessageDto = z.infer<typeof UpdateContactMessageSchema>;
