import { z } from 'zod';

export const AUDIT_ACTIONS = [
  'order:create',
  'order:status_changed',
  'order:note_added',
  'order:refund',
  'menu:item:write',
  'menu:item:delete',
  'menu:category:write',
  'menu:category:delete',
  'promotion:write',
  'promotion:delete',
  'staff:invite',
  'staff:role_change',
  'staff:deactivate',
  'staff:reactivate',
  'settings:write',
  'review:moderate',
  'reservation:cancel',
  'reservation:seat',
  'reservation:no_show',
  'reservation:complete',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  beforeJson: z.unknown().nullable().optional(),
  afterJson: z.unknown().nullable().optional(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditLogEntryDto = z.infer<typeof AuditLogEntrySchema>;

export const AuditLogListSchema = z.object({
  items: z.array(AuditLogEntrySchema),
  nextCursor: z.string().nullable(),
});
export type AuditLogListDto = z.infer<typeof AuditLogListSchema>;

export const AuditLogListQuerySchema = z.object({
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;
