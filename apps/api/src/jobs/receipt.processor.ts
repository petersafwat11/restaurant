import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  JOB_EMAIL_RECEIPT,
  JOB_RECEIPT_GENERATE,
  QUEUE_EMAIL,
  QUEUE_RECEIPT,
  ReceiptGeneratePayloadSchema,
} from '@repo/jobs';
import { type Job, type Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { renderReceiptPdf } from './receipt-pdf';

@Processor(QUEUE_RECEIPT)
export class ReceiptProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {
    super();
  }

  override async process(job: Job): Promise<void> {
    if (job.name !== JOB_RECEIPT_GENERATE) {
      this.logger.warn(`Unknown receipt job: ${job.name}`);
      return;
    }

    const payload = ReceiptGeneratePayloadSchema.parse(job.data);
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: true,
        payment: true,
        restaurant: { select: { name: true } },
        user: { select: { email: true } },
      },
    });
    if (!order) {
      this.logger.warn(`Receipt job ${job.id}: order ${payload.orderId} not found`);
      return;
    }

    const pdf = await renderReceiptPdf({
      restaurantName: order.restaurant.name,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      currency: order.currency,
      items: order.items.map((it) => ({
        name: it.nameSnapshot,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toFixed(2),
        lineTotal: it.lineTotal.toFixed(2),
      })),
      subtotal: order.subtotal.toFixed(2),
      discountTotal: order.discountTotal.toFixed(2),
      taxTotal: order.taxTotal.toFixed(2),
      deliveryFee: order.deliveryFee.toFixed(2),
      tipAmount: order.tipAmount.toFixed(2),
      grandTotal: order.grandTotal.toFixed(2),
      paymentMethod: order.payment?.method ?? null,
      refundedAmount: null,
    });

    if (!order.user?.email) {
      this.logger.log(`Receipt for guest order ${order.orderNumber} generated; no email to send`);
      return;
    }

    await this.emailQueue.add(JOB_EMAIL_RECEIPT, {
      orderId: order.id,
      to: order.user.email,
      pdfBase64: pdf.toString('base64'),
      orderNumber: order.orderNumber,
      currency: order.currency,
      grandTotal: order.grandTotal.toFixed(2),
    });
  }
}
