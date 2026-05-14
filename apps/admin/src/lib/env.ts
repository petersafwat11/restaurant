import { z } from 'zod';

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
