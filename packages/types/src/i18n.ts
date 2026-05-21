import { z } from 'zod';

export const LocaleSchema = z.enum(['en', 'ar', 'pl']);
export type LocaleCode = z.infer<typeof LocaleSchema>;

export const I18nMessagesQuerySchema = z.object({
  locale: LocaleSchema.optional(),
});
export type I18nMessagesQuery = z.infer<typeof I18nMessagesQuerySchema>;

// The catalog is an arbitrarily-nested string tree; clients hydrate it as-is.
export const I18nMessagesSchema = z.object({
  locale: LocaleSchema,
  dir: z.enum(['ltr', 'rtl']),
  messages: z.record(z.string(), z.unknown()),
});
export type I18nMessagesDto = z.infer<typeof I18nMessagesSchema>;
