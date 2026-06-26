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

export const PUSH_PLATFORMS = ['ios', 'android', 'web'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export const RegisterPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(PUSH_PLATFORMS),
});
export type RegisterPushTokenDto = z.infer<typeof RegisterPushTokenSchema>;

export const NotificationPreferenceSchema = z.object({
  orderUpdatesPush: z.boolean(),
  orderUpdatesEmail: z.boolean(),
  orderUpdatesSms: z.boolean(),
  promotionsPush: z.boolean(),
  promotionsEmail: z.boolean(),
});
export type NotificationPreferenceDto = z.infer<typeof NotificationPreferenceSchema>;

// Browser Web Push subscription registered by the admin PWA so staff get
// background "new order" alerts even when the dashboard tab is closed. Shape
// mirrors the browser's `PushSubscription.toJSON()`.
export const WebPushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});
export type WebPushSubscriptionInputDto = z.infer<typeof WebPushSubscriptionInputSchema>;

export const UpdateNotificationPreferenceSchema = NotificationPreferenceSchema.partial();
export type UpdateNotificationPreferenceDto = z.infer<
  typeof UpdateNotificationPreferenceSchema
>;
