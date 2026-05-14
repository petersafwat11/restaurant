import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_REPORTS_CLEANUP,
  JOB_REPORTS_GENERATE,
  QUEUE_REPORTS,
  type ReportsGeneratePayload,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { ReportsService } from '../reports/reports.service';

@Processor(QUEUE_REPORTS)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly reports: ReportsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOB_REPORTS_GENERATE) {
      const data = job.data as ReportsGeneratePayload;
      this.logger.log(`Generating export ${data.exportId}`);
      await this.reports.processExport(data.exportId);
      return;
    }
    if (job.name === JOB_REPORTS_CLEANUP) {
      const removed = await this.reports.cleanupExpired();
      this.logger.log(`Cleaned up ${removed} expired exports`);
      return;
    }
  }
}
