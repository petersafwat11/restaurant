import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOB_WHATSAPP_NEW_ORDER, QUEUE_WHATSAPP, WhatsappNewOrderPayloadSchema } from '@repo/jobs';
import type { Job } from 'bullmq';
import { newOrderWhatsappText } from '../notifications/new-order-alert-copy';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Processor(QUEUE_WHATSAPP)
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly whatsapp: WhatsappService) {
    super();
  }

  override async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_WHATSAPP_NEW_ORDER: {
        const payload = WhatsappNewOrderPayloadSchema.parse(job.data);
        await this.whatsapp.send({ to: payload.phone, body: newOrderWhatsappText(payload) });
        return;
      }
      default:
        this.logger.warn(`Unknown whatsapp job: ${job.name}`);
    }
  }
}
