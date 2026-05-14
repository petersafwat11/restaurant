import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV, type ENV_TYPE } from '../config/config.module';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(ENV) env: ENV_TYPE) {
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  async onModuleInit() {
    // ioredis auto-connects; ping to surface bad URLs early.
    await this.client.ping().catch(() => {
      /* connection errors will be retried */
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }
}
