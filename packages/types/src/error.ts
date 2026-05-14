import { z } from 'zod';

export const ErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string(),
  path: z.string().optional(),
});

export type ErrorDto = z.infer<typeof ErrorSchema>;
