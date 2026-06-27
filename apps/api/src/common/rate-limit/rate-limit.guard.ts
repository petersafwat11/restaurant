import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

/**
 * Global Redis-backed fixed-window rate limiter (plan §I1). Acts only on routes
 * carrying `@RateLimit(...)`; everything else passes through. Redis-backed so
 * the limit is shared across API replicas; uses Fastify's `request.ip` (the app
 * runs with `trustProxy: true`, so this is the real client IP behind Caddy).
 *
 * Registered after the auth guard so an authenticated caller can be keyed on
 * their stable user id. If Redis is unreachable the request is allowed through
 * (fail-open) — rate limiting is a safeguard, not an availability dependency.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!opts) return true;

    const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: { id?: string } }>();
    const res = ctx.switchToHttp().getResponse<FastifyReply>();

    const perUser = opts.perUser !== false;
    const fingerprint =
      perUser && req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || 'unknown'}`;
    const key = `rl:${opts.name}:${fingerprint}`;

    let count: number;
    try {
      count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, opts.windowSeconds);
    } catch (err) {
      // Fail-open: never let a Redis blip take down the endpoint.
      this.logger.warn(`Rate-limit check skipped (redis error): ${(err as Error).message}`);
      return true;
    }

    if (count > opts.limit) {
      const ttl = await this.redis.client.ttl(key).catch(() => opts.windowSeconds);
      const retryAfter = ttl > 0 ? ttl : opts.windowSeconds;
      res.header('Retry-After', String(retryAfter));
      // Security metric — lets ops alert on bursts without logging PII/secrets.
      this.logger.warn(`[RATE_LIMIT] ${opts.name} exceeded for ${fingerprint}`);
      throw new HttpException(
        'Too many requests — please slow down and try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
