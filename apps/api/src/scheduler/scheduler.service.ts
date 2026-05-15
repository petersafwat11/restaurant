import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  JOB_PUSH_TOKEN_CLEANUP,
  JOB_REPORTS_CLEANUP,
  QUEUE_PUSH,
  QUEUE_REPORTS,
} from '@repo/jobs';
import type { Queue } from 'bullmq';

/**
 * Registers the platform's repeatable jobs at boot. Prior sprints deferred
 * this ("scheduler bootstrap" in the Sprints 7+8 report); Sprint 9 needs it for
 * push-token cleanup and reports cleanup.
 *
 * Scope is deliberately limited to jobs that have **no** self-registration.
 * The analytics rollup/finalize repeatables are owned by
 * `AnalyticsProcessor.onModuleInit` (with an explicit `tz`); registering them
 * here too produced a *different* BullMQ repeat key (no tz vs `tz:'UTC'`), so
 * they did not dedupe and the rollup ran twice. Keep analytics out of here.
 *
 * Idempotent: each repeatable is added with a stable cron pattern, so
 * re-running boot does not stack duplicate schedulers (BullMQ keys the repeat
 * by name + pattern). Cron times are UTC.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue,
    @InjectQueue(QUEUE_REPORTS) private readonly reportsQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.DISABLE_SCHEDULERS === '1') {
      this.logger.warn('Schedulers disabled via DISABLE_SCHEDULERS=1');
      return;
    }
    try {
      await this.pushQueue.add(
        JOB_PUSH_TOKEN_CLEANUP,
        {},
        {
          jobId: 'repeat:push-token-cleanup',
          repeat: { pattern: '30 3 * * *' }, // daily 03:30 UTC
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );

      await this.reportsQueue.add(
        JOB_REPORTS_CLEANUP,
        {},
        {
          jobId: 'repeat:reports-cleanup',
          repeat: { pattern: '0 4 * * *' }, // daily 04:00 UTC
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );

      this.logger.log('Repeatable jobs registered');
    } catch (err) {
      // Never block app boot on the scheduler (e.g. Redis briefly unavailable).
      this.logger.error(
        `Failed to register repeatable jobs: ${(err as Error).message}`,
      );
    }
  }
}
