import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Thin wrapper around Redis for read-through caching with TTL.
 *
 * Use `getOrSet` for read paths: it serializes hits, deserializes on read,
 * and falls back to the loader on cache miss. `invalidate` removes keys; pass
 * an array for batch invalidation (e.g., a menu write busting both the tree
 * cache and any related index keys).
 *
 * `set`/`get` are exposed for write-through patterns (availability fast-path
 * in the menu module): writers set a per-item key without busting the tree.
 */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.client.set(key, serialized);
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async invalidate(keys: string | readonly string[]): Promise<void> {
    const list = typeof keys === 'string' ? [keys] : keys;
    if (list.length === 0) return;
    await this.redis.client.del(...list);
  }
}
