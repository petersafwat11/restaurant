import { z } from 'zod';

// JSON-LD is an open shape; we validate the envelope, not every schema.org key.
export const StructuredDataSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@graph': z.array(z.record(z.unknown())),
});
export type StructuredDataDto = z.infer<typeof StructuredDataSchema>;

export const SeoMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string().nullable(),
  canonical: z.string(),
});
export type SeoMetaDto = z.infer<typeof SeoMetaSchema>;

export const SeoMetaQuerySchema = z.object({
  path: z.string().default('/'),
});
export type SeoMetaQuery = z.infer<typeof SeoMetaQuerySchema>;
