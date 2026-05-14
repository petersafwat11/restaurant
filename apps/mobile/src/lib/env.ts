import { z } from 'zod';

const PublicEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

export const env = PublicEnvSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
