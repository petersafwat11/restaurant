import { z } from 'zod';

export const UPLOAD_KINDS = [
  'menu-item-image',
  'restaurant-logo',
  'restaurant-cover',
  'review-image',
] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export const UploadKindSchema = z.enum(UPLOAD_KINDS);

export const UploadResponseSchema = z.object({
  publicUrl: z.string(),
  key: z.string(),
});
export type UploadResponseDto = z.infer<typeof UploadResponseSchema>;
