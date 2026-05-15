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

export const PresignUploadSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, `File must be ≤ ${MAX_UPLOAD_BYTES} bytes (5MB)`),
});
export type PresignUploadDto = z.infer<typeof PresignUploadSchema>;

export const PresignedUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  publicUrl: z.string(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
});
export type PresignedUploadResponseDto = z.infer<typeof PresignedUploadResponseSchema>;
