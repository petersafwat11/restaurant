import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Logical bucket name — keeps different routes' counters separate. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Fixed window length in seconds. */
  windowSeconds: number;
  /**
   * When the caller is authenticated, key the bucket on their user id instead
   * of their IP (a logged-in user can't dodge the limit by rotating IPs).
   * Falls back to IP for guests. Default true; set false for pre-auth routes
   * (login/register) where there is no user yet.
   */
  perUser?: boolean;
}

/**
 * Mark a route for Redis-backed fixed-window rate limiting (plan §I1). Enforced
 * by the global `RateLimitGuard`. Routes without this decorator are unlimited —
 * notably payment-provider webhooks, which must never be customer-rate-limited.
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
