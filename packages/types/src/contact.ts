import { z } from 'zod';

export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CreateContactMessageSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().max(160).optional(),
  message: z.string().min(1).max(5000),
});
export type CreateContactMessageDto = z.infer<typeof CreateContactMessageSchema>;

export const ContactMessageSchema = z.object({
  id: z.string(),
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
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ContactMessageListQuery = z.infer<typeof ContactMessageListQuerySchema>;

export const UpdateContactMessageSchema = z.object({
  status: z.enum(CONTACT_STATUSES),
});
export type UpdateContactMessageDto = z.infer<typeof UpdateContactMessageSchema>;

export const CONTACT_NOTE_KINDS = ['NOTE', 'REPLY'] as const;
export type ContactNoteKind = (typeof CONTACT_NOTE_KINDS)[number];

export const ContactNoteSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  authorId: z.string(),
  kind: z.enum(CONTACT_NOTE_KINDS),
  body: z.string(),
  createdAt: z.string(),
});
export type ContactNoteDto = z.infer<typeof ContactNoteSchema>;

export const ContactNoteListSchema = z.array(ContactNoteSchema);

export const CreateContactNoteSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type CreateContactNoteDto = z.infer<typeof CreateContactNoteSchema>;

export const ContactReplySchema = z.object({
  body: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
});
export type ContactReplyDto = z.infer<typeof ContactReplySchema>;
