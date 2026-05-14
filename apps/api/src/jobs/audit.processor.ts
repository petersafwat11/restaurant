import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  AuditWritePayloadSchema,
  JOB_AUDIT_WRITE,
  QUEUE_AUDIT,
} from '@repo/jobs';
import type { Job } from 'bullmq';
import { AuditService } from '../audit-log/audit.service';

@Processor(QUEUE_AUDIT)
export class AuditProcessor extends WorkerHost {
  constructor(private readonly audit: AuditService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_AUDIT_WRITE) return;
    const payload = AuditWritePayloadSchema.parse(job.data ?? {});
    await this.audit.write(payload);
  }
}
