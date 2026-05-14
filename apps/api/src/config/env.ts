import { createEnv } from '@repo/config-runtime';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  RESEND_API_KEY: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Restaurant <no-reply@restaurant.local>'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),

  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_FROM: z.string().optional().default(''),

  APP_URL_WEB: z.string().url().default('http://localhost:3000'),
  APP_URL_ADMIN: z.string().url().default('http://localhost:3001'),
  APP_DEEP_LINK_SCHEME: z.string().default('restaurant'),

  // Cloudflare R2 (S3-compatible). Empty in dev → uploads service falls
  // back to a stubbed presigned URL so e2e tests + bring-up don't need
  // real credentials.
  R2_ENDPOINT: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().optional().default(''),
  R2_PUBLIC_URL: z.string().optional().default(''),
  R2_REGION: z.string().default('auto'),

  // Stripe. Empty in dev → payments module runs a fake provider that issues
  // a deterministic `client_secret` so the frontend SDK path can still be
  // exercised without real Stripe keys.
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = createEnv(EnvSchema);
