import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  AnalyticsRollupPayloadSchema,
  JOB_ANALYTICS_ROLLUP_DAILY,
  JOB_ANALYTICS_ROLLUP_FINALIZE,
  QUEUE_ANALYTICS,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor(QUEUE_ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (
      job.name === JOB_ANALYTICS_ROLLUP_DAILY ||
      job.name === JOB_ANALYTICS_ROLLUP_FINALIZE
    ) {
      const data = AnalyticsRollupPayloadSchema.parse(job.data ?? {});
      const restaurants = data.restaurantId
        ? [{ id: data.restaurantId }]
        : await this.prisma.restaurant.findMany({
            where: { isActive: true },
            select: { id: true },
          });

      const target = data.date ? new Date(data.date) : new Date();
      if (job.name === JOB_ANALYTICS_ROLLUP_FINALIZE && !data.date) {
        // Yesterday
        target.setUTCDate(target.getUTCDate() - 1);
      }

      for (const r of restaurants) {
        await this.analytics.rollupDay(r.id, target);
      }
      this.logger.log(
        `Rolled up ${restaurants.length} restaurants for ${target.toISOString().slice(0, 10)}`,
      );
    }
  }
}
