import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Redis-backed idempotency keys for POST /orders. The hash combines the
 * authed user id (or guest sessionKey) with the client-supplied
 * `Idempotency-Key` header so two clients can't collide. The value stored is
 * the resulting `orderId` — replays return it without creating a new order.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  private key(scope: string, idempotencyKey: string): string {
    const h = createHash('sha256').update(`${scope}|${idempotencyKey}`).digest('hex');
    return `idempotency:order:${h}`;
  }

  async get(scope: string, idempotencyKey: string): Promise<string | null> {
    return this.redis.client.get(this.key(scope, idempotencyKey));
  }

  async store(scope: string, idempotencyKey: string, orderId: string): Promise<void> {
    await this.redis.client.set(this.key(scope, idempotencyKey), orderId, 'EX', TTL_SECONDS);
  }
}
