import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.unknown().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof NotificationSchema>;

export const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().nullable(),
  unreadCount: z.number().int(),
});
export type NotificationListDto = z.infer<typeof NotificationListSchema>;

export const NotificationListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const UnreadCountSchema = z.object({ unreadCount: z.number().int() });
export type UnreadCountDto = z.infer<typeof UnreadCountSchema>;

// NOTE (Slice 10): push notifications + the Expo mobile app were removed. The
// `orderUpdatesPush` / `promotionsPush` fields are RETAINED (inert) because the
// matching Prisma columns are kept until a later migration drops them after a
// production token-count check; removing them here would break the DTO ↔ column
// round-trip. There is no longer a push-token registration DTO.
export const NotificationPreferenceSchema = z.object({
  orderUpdatesPush: z.boolean(),
  orderUpdatesEmail: z.boolean(),
  orderUpdatesSms: z.boolean(),
  promotionsPush: z.boolean(),
  promotionsEmail: z.boolean(),
});
export type NotificationPreferenceDto = z.infer<typeof NotificationPreferenceSchema>;

export const UpdateNotificationPreferenceSchema = NotificationPreferenceSchema.partial();
export type UpdateNotificationPreferenceDto = z.infer<typeof UpdateNotificationPreferenceSchema>;

export const WebPushSubscriptionInputSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(512).optional(),
});
export type WebPushSubscriptionInputDto = z.infer<typeof WebPushSubscriptionInputSchema>;

export const WebPushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});
export type WebPushUnsubscribeDto = z.infer<typeof WebPushUnsubscribeSchema>;

export const WebPushSubscriptionResultSchema = z.object({ success: z.literal(true) });
export type WebPushSubscriptionResultDto = z.infer<typeof WebPushSubscriptionResultSchema>;
