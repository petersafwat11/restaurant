import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  JOB_ANALYTICS_ROLLUP_DAILY,
  JOB_ANALYTICS_ROLLUP_FINALIZE,
  JOB_PUSH_TOKEN_CLEANUP,
  JOB_REPORTS_CLEANUP,
  QUEUE_ANALYTICS,
  QUEUE_PUSH,
  QUEUE_REPORTS,
} from '@repo/jobs';
import type { Queue } from 'bullmq';

/**
 * Registers the platform's repeatable jobs at boot. Prior sprints deferred
 * this ("scheduler bootstrap" in the Sprints 7+8 report); Sprint 9 needs it for
 * push-token cleanup and it cleanly closes the analytics/reports gaps too.
 *
 * Idempotent: each repeatable is added with a stable `jobId` + cron pattern, so
 * re-running boot does not stack duplicate schedulers (BullMQ dedupes the
 * repeat key). Cron times are UTC; per-restaurant tz finalize is handled inside
 * the analytics processor.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue,
    @InjectQueue(QUEUE_ANALYTICS) private readonly analyticsQueue: Queue,
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

      await this.analyticsQueue.add(
        JOB_ANALYTICS_ROLLUP_DAILY,
        {},
        {
          jobId: 'repeat:analytics-rollup-daily',
          repeat: { pattern: '0 * * * *' }, // hourly
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );

      await this.analyticsQueue.add(
        JOB_ANALYTICS_ROLLUP_FINALIZE,
        {},
        {
          jobId: 'repeat:analytics-rollup-finalize',
          repeat: { pattern: '0 2 * * *' }, // nightly 02:00 UTC
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
