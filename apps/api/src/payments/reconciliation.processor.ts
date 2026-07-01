import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnModuleInit } from '@nestjs/common';
import { JOB_PAYMENT_RECONCILE, QUEUE_RECONCILIATION } from '@repo/jobs';
import type { Job, Queue } from 'bullmq';
import { PaymentsService } from './payments.service';

// Every 15 minutes — repair payments where a Stripe webhook was missed or the
// intent died, and surface anything unexpected (plan §F6).
const RECONCILE_CRON = '*/15 * * * *';
const CRON_TZ = 'UTC';

@Processor(QUEUE_RECONCILIATION)
export class ReconciliationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(
    private readonly payments: PaymentsService,
    @InjectQueue(QUEUE_RECONCILIATION) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Idempotent: BullMQ keys repeatable jobs by name + cron, so re-adding on
    // every boot does not duplicate the schedule.
    await this.queue.add(
      JOB_PAYMENT_RECONCILE,
      {},
      { repeat: { pattern: RECONCILE_CRON, tz: CRON_TZ } },
    );
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_PAYMENT_RECONCILE) return;
    const result = await this.payments.reconcilePayments();
    this.logger.log(
      `[RECONCILE] checked=${result.checked} repaired=${result.repaired} attention=${result.attention}`,
    );
  }
}
