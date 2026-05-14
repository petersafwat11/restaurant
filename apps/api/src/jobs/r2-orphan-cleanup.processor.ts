import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnModuleInit } from '@nestjs/common';
import { JOB_R2_ORPHAN_SWEEP, QUEUE_R2_CLEANUP } from '@repo/jobs';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

const SOFT_WINDOW_DAYS = 7;
const REPEAT_CRON = '0 3 * * *'; // daily at 03:00 UTC
const REPEAT_TZ = 'UTC';

/**
 * Scheduled BullMQ processor that sweeps R2 objects no longer referenced by
 * any DB row. Objects newer than {@link SOFT_WINDOW_DAYS} are skipped so an
 * in-flight upload between presign and DB-link isn't deleted out from under
 * the user.
 *
 * Stub mode (no R2 creds) → processor logs and exits without listing.
 */
@Processor(QUEUE_R2_CLEANUP)
export class R2OrphanCleanupProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(R2OrphanCleanupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    @InjectQueue(QUEUE_R2_CLEANUP) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Idempotent: BullMQ keys repeatable jobs by name + cron, so re-adding on
    // every boot does not duplicate the schedule.
    await this.queue.add(
      JOB_R2_ORPHAN_SWEEP,
      {},
      { repeat: { pattern: REPEAT_CRON, tz: REPEAT_TZ } },
    );
  }

  override async process(job: Job): Promise<void> {
    if (job.name !== JOB_R2_ORPHAN_SWEEP) {
      this.logger.warn(`Unknown r2 cleanup job: ${job.name}`);
      return;
    }
    if (this.uploads.isStubMode) {
      this.logger.log('skipping — R2 not configured');
      return;
    }

    // Build the set of referenced keys from MenuItemImage.url. Future tables
    // that consume the same bucket should extend this set.
    const images = await this.prisma.menuItemImage.findMany({ select: { url: true } });
    const referenced = new Set<string>();
    for (const img of images) {
      const key = this.uploads.extractKeyFromUrl(img.url);
      if (key) referenced.add(key);
    }

    const cutoff = new Date(Date.now() - SOFT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    let deleted = 0;
    let scanned = 0;

    for await (const obj of this.uploads.listAllKeys()) {
      scanned += 1;
      if (referenced.has(obj.key)) continue;
      if (obj.lastModified && obj.lastModified > cutoff) continue;
      await this.uploads.deleteObject(obj.key);
      deleted += 1;
    }
    this.logger.log(`R2 orphan sweep: scanned=${scanned} deleted=${deleted}`);
  }
}
