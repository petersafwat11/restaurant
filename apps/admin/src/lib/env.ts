import { z } from 'zod';

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  // VAPID public key for admin PWA web-push. Optional: when empty, the
  // "background order alerts" toggle reports push as unavailable.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().default(''),
});

export const env = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});
