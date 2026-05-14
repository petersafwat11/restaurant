import { z } from 'zod';

export const EXPORT_KINDS = [
  'sales-by-item',
  'sales-by-category',
  'sales-by-hour',
  'sales-by-day-of-week',
  'tax-summary',
  'payment-methods',
  'customer-retention',
  'orders-detail',
] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_STATUSES = ['queued', 'processing', 'ready', 'failed'] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const EXPORT_FORMATS = ['csv', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const ExportSchema = z.object({
  id: z.string(),
  requestedByUserId: z.string(),
  restaurantId: z.string().nullable(),
  kind: z.enum(EXPORT_KINDS),
  format: z.enum(EXPORT_FORMATS),
  status: z.enum(EXPORT_STATUSES),
  fileSize: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  expiresAt: z.string(),
});
export type ExportDto = z.infer<typeof ExportSchema>;

export const ExportListSchema = z.array(ExportSchema);

export const CreateExportSchema = z.object({
  kind: z.enum(EXPORT_KINDS),
  format: z.enum(EXPORT_FORMATS).default('csv'),
  restaurantId: z.string().min(1),
  params: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .passthrough()
    .optional(),
});
export type CreateExportDto = z.infer<typeof CreateExportSchema>;

export const ExportDownloadResponseSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
});
export type ExportDownloadResponseDto = z.infer<typeof ExportDownloadResponseSchema>;
