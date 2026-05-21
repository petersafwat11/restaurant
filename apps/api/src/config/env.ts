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
  APP_URL_API: z.string().url().default('http://localhost:4000'),
  APP_DEEP_LINK_SCHEME: z.string().default('restaurant'),

  // Local-disk uploads. Files are written under UPLOADS_DIR and served via
  // the API at `${APP_URL_API}/uploads/{key}` (static middleware in main.ts).
  // In prod, UPLOADS_DIR is a bind-mounted Docker volume (`/var/uploads`).
  UPLOADS_DIR: z.string().default('uploads'),

  // Stripe. Empty in dev → payments module runs a fake provider that issues
  // a deterministic `client_secret` so the frontend SDK path can still be
  // exercised without real Stripe keys.
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),

  // Secret used to HMAC-sign public deep links (order tracking URLs sent in
  // confirmation emails). Falls back to JWT_ACCESS_SECRET in non-prod for dev
  // bring-up; production deployments should set this explicitly.
  ORDER_TRACKING_SECRET: z.string().optional().default(''),

  // Sprint 12 — observability + analytics + feature flags. All optional;
  // empty → safe no-op (same contract as Stripe/R2 above).
  SENTRY_DSN: z.string().optional().default(''),
  SENTRY_ENV: z.string().optional().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  POSTHOG_KEY: z.string().optional().default(''),
  POSTHOG_HOST: z.string().optional().default('https://app.posthog.com'),
  FEATURE_FLAG_OVERRIDES: z.string().optional().default(''),

  // Auth cookie attributes. Default `lax` works when web/admin/api share an
  // eTLD+1; set `none` (plus HTTPS) for fully cross-site deployments.
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  // Window before AT expiry (seconds) where the sliding refresh kicks in.
  AUTH_SLIDING_REFRESH_THRESHOLD: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = createEnv(EnvSchema);
