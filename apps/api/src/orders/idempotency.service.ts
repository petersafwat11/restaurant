import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const PENDING = '__pending__';

export type ReservationResult =
  | { status: 'reserved' }
  | { status: 'pending' }
  | { status: 'done'; orderId: string };

/**
 * Redis-backed idempotency for POST /orders. The hash combines the authed
 * user id (or guest sessionKey) with the client `Idempotency-Key` header so
 * two clients can't collide.
 *
 * `reserve()` claims the key atomically (`SET NX`) BEFORE any work, closing
 * the concurrent-duplicate window: a second in-flight request with the same
 * key sees `pending` (reject/retry) instead of racing into a second order.
 * The real `orderId` overwrites the placeholder once the order commits.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  private key(scope: string, idempotencyKey: string): string {
    const h = createHash('sha256').update(`${scope}|${idempotencyKey}`).digest('hex');
    return `idempotency:order:${h}`;
  }

  async reserve(scope: string, idempotencyKey: string): Promise<ReservationResult> {
    const k = this.key(scope, idempotencyKey);
    const ok = await this.redis.client.set(k, PENDING, 'EX', TTL_SECONDS, 'NX');
    if (ok === 'OK') return { status: 'reserved' };
    const val = await this.redis.client.get(k);
    // Key existed at SET-NX time. If it raced to expiry, be conservative and
    // treat as pending (client retries) rather than risk a duplicate order.
    if (val === null || val === PENDING) return { status: 'pending' };
    return { status: 'done', orderId: val };
  }

  async get(scope: string, idempotencyKey: string): Promise<string | null> {
    const val = await this.redis.client.get(this.key(scope, idempotencyKey));
    return val === null || val === PENDING ? null : val;
  }

  async store(scope: string, idempotencyKey: string, orderId: string): Promise<void> {
    await this.redis.client.set(this.key(scope, idempotencyKey), orderId, 'EX', TTL_SECONDS);
  }

  /** Release a reservation so a failed attempt can be retried by the client. */
  async release(scope: string, idempotencyKey: string): Promise<void> {
    await this.redis.client.del(this.key(scope, idempotencyKey));
  }
}
