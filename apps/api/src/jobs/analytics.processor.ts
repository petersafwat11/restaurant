import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnModuleInit } from '@nestjs/common';
import {
  AnalyticsRollupPayloadSchema,
  JOB_ANALYTICS_ROLLUP_DAILY,
  JOB_ANALYTICS_ROLLUP_FINALIZE,
  QUEUE_ANALYTICS,
} from '@repo/jobs';
import type { Job, Queue } from 'bullmq';
import { AnalyticsService } from '../analytics/analytics.service';

// Hourly: refresh today's working DailyMetric row.
const DAILY_CRON = '0 * * * *';
// 02:00 UTC: finalize the previous day.
const FINALIZE_CRON = '0 2 * * *';
const CRON_TZ = 'UTC';

@Processor(QUEUE_ANALYTICS)
export class AnalyticsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private readonly analytics: AnalyticsService,
    @InjectQueue(QUEUE_ANALYTICS) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Idempotent: BullMQ keys repeatable jobs by name + cron, so re-adding on
    // every boot does not duplicate the schedule. The DailyMetric rollup table
    // backs efficient historical KPI reads; on-demand aggregation remains the
    // fallback when a day's row hasn't been built yet.
    await this.queue.add(
      JOB_ANALYTICS_ROLLUP_DAILY,
      {},
      { repeat: { pattern: DAILY_CRON, tz: CRON_TZ } },
    );
    await this.queue.add(
      JOB_ANALYTICS_ROLLUP_FINALIZE,
      {},
      { repeat: { pattern: FINALIZE_CRON, tz: CRON_TZ } },
    );
  }

  async process(job: Job): Promise<void> {
    if (
      job.name === JOB_ANALYTICS_ROLLUP_DAILY ||
      job.name === JOB_ANALYTICS_ROLLUP_FINALIZE
    ) {
      const data = AnalyticsRollupPayloadSchema.parse(job.data ?? {});

      const target = data.date ? new Date(data.date) : new Date();
      if (job.name === JOB_ANALYTICS_ROLLUP_FINALIZE && !data.date) {
        // Yesterday
        target.setUTCDate(target.getUTCDate() - 1);
      }

      await this.analytics.rollupDay(target);
      this.logger.log(`Rolled up ${target.toISOString().slice(0, 10)}`);
    }
  }
}
