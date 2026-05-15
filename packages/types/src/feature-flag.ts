import { z } from 'zod';

// Resolved flag map for the current principal — `key → boolean`.
export const FeatureFlagsResolvedSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
});
export type FeatureFlagsResolvedDto = z.infer<typeof FeatureFlagsResolvedSchema>;

export const FeatureFlagAdminSchema = z.object({
  key: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100),
  default: z.boolean(),
});
export type FeatureFlagAdminDto = z.infer<typeof FeatureFlagAdminSchema>;

export const FeatureFlagListSchema = z.object({
  items: z.array(FeatureFlagAdminSchema),
});
export type FeatureFlagListDto = z.infer<typeof FeatureFlagListSchema>;

export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
});
export type UpdateFeatureFlagDto = z.infer<typeof UpdateFeatureFlagSchema>;
