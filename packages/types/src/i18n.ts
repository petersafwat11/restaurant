import { z } from 'zod';

export const LocaleSchema = z.enum(['pl', 'en']);
export type LocaleCode = z.infer<typeof LocaleSchema>;
