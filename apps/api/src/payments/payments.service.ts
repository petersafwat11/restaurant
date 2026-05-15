import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Order, Payment, Refund } from '@repo/db';
import {
  JOB_EMAIL_REFUND,
  JOB_RECEIPT_GENERATE,
  QUEUE_EMAIL,
  QUEUE_RECEIPT,
} from '@repo/jobs';
import type {
  CreatePaymentIntentDto,
  CreateRefundDto,
  PaymentConfigDto,
  PaymentDto,
  PaymentIntentResponseDto,
  PaymentMethodKind,
  PaymentStatus,
  RefundDto,
} from '@repo/types';
import { Decimal, addAll, clampNonNegative, decimalToString, toDecimal } from '@repo/utils';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ParsedWebhookEvent, PaymentProvider } from './provider.interface';
import { CodProvider } from './providers/cod.provider';
import { StripeProvider } from './providers/stripe.provider';
import { WebhookEventsService } from './webhook-events.service';

interface PaymentActor {
  userId: string | null;
  permissions: string[];
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(ENV) private readonly env: ENV_TYPE,
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly codProvider: CodProvider,
    private readonly webhookEvents: WebhookEventsService,
    private readonly orders: OrdersService,
    @InjectQueue(QUEUE_RECEIPT) private readonly receiptQueue: Queue,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  getConfig(): PaymentConfigDto {
    return {
      stripePublishableKey: this.env.STRIPE_PUBLISHABLE_KEY,
      currency: 'PLN',
    };
  }

  // ---- Create intent -----------------------------------------------------

  async createIntent(
    actor: PaymentActor,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!actor.userId || order.userId !== actor.userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is not pending (status: ${order.status})`);
    }
    if (order.payment && order.payment.status === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }

    const provider = this.pickProvider(dto.provider, dto.methodKind);

    const intent = await provider.createIntent({
      orderId: order.id,
      amount: order.grandTotal.toFixed(2),
      currency: order.currency,
      methodKind: dto.methodKind,
      metadata: { orderNumber: order.orderNumber },
    });

    // Upsert the payment row.
    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        provider: provider.id,
        providerRef: intent.providerRef,
        method: dto.methodKind,
        amount: order.grandTotal,
        currency: order.currency,
        status: intent.confirmed ? 'PAID' : 'PENDING',
      },
      create: {
        orderId: order.id,
        provider: provider.id,
        providerRef: intent.providerRef,
        method: dto.methodKind,
        amount: order.grandTotal,
        currency: order.currency,
        status: intent.confirmed ? 'PAID' : 'PENDING',
      },
    });

    // COD short-circuits: confirm the order immediately and emit the same
    // events the Stripe webhook would, so Sprint 5's notification dispatcher
    // can listen on a single channel.
    if (intent.confirmed) {
      await this.confirmOrderFromPayment(order, payment.id);
    }

    return {
      paymentId: payment.id,
      provider: provider.id,
      status: payment.status,
      clientSecret: intent.clientSecret,
      publishableKey: provider.id === 'stripe' ? this.env.STRIPE_PUBLISHABLE_KEY : null,
      confirmed: intent.confirmed,
    };
  }

  // ---- Refund ------------------------------------------------------------

  async refund(
    actor: PaymentActor,
    paymentId: string,
    dto: CreateRefundDto,
  ): Promise<RefundDto> {
    if (!actor.permissions.includes('payment:refund')) {
      throw new ForbiddenException('payment:refund required');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true, order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException('Payment is not refundable');
    }
    if (!payment.providerRef) {
      throw new BadRequestException('Payment is missing providerRef');
    }

    const alreadyRefunded = addAll(payment.refunds.map((r) => r.amount));
    const remaining = clampNonNegative(toDecimal(payment.amount).minus(alreadyRefunded));
    const requested = dto.amount ? toDecimal(dto.amount) : remaining;

    if (requested.lte(0)) {
      throw new BadRequestException('Refund amount must be > 0');
    }
    if (requested.gt(remaining)) {
      throw new BadRequestException(
        `Refund amount ${requested.toFixed(2)} exceeds remaining ${remaining.toFixed(2)}`,
      );
    }

    if (payment.method === 'PAYMOB') {
      throw new BadRequestException('PAYMOB provider is not supported');
    }
    const provider = this.pickProvider(
      payment.provider as 'stripe' | 'cod',
      payment.method as PaymentMethodKind,
    );
    const result = await provider.refund({
      providerRef: payment.providerRef,
      amount: decimalToString(requested),
      currency: payment.currency,
      reason: dto.reason,
    });

    const { refund, fullRefund } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: requested,
          reason: dto.reason,
          providerRef: result.providerRef,
        },
      });

      const totalRefunded = alreadyRefunded.plus(requested);
      const isFull = totalRefunded.gte(payment.amount);
      const newStatus: PaymentStatus = isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      return { refund: created, fullRefund: isFull };
    });

    // If fully refunded, transition the order through the state machine so the
    // transition is guarded, realtime `order.status_changed` fires, the kitchen
    // ticket is pulled, and the notification dispatcher reacts. (Previously a
    // raw tx.order.update bypassed all of that — no customer notification.)
    if (fullRefund) {
      try {
        await this.orders.forceTransition(
          payment.orderId,
          'REFUNDED',
          actor.userId,
          dto.reason ?? 'Refunded',
        );
      } catch (err) {
        this.logger.warn(
          `Order ${payment.orderId} REFUNDED transition skipped: ${(err as Error).message}`,
        );
      }
    }

    // Enqueue the refund-confirmation email if we have a customer email.
    const customer = payment.order.userId
      ? await this.prisma.user.findUnique({
          where: { id: payment.order.userId },
          select: { email: true },
        })
      : null;
    if (customer?.email) {
      await this.emailQueue.add(JOB_EMAIL_REFUND, {
        orderId: payment.orderId,
        to: customer.email,
        orderNumber: payment.order.orderNumber,
        currency: payment.order.currency,
        amount: decimalToString(requested),
        reason: dto.reason ?? null,
      });
    }

    this.logger.log(`Refund ${refund.id} processed for payment ${payment.id}`);
    return toRefundDto(refund);
  }

  // ---- Read --------------------------------------------------------------

  async byOrderId(actor: PaymentActor, orderId: string): Promise<PaymentDto | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = actor.userId !== null && order.userId === actor.userId;
    const canRead = actor.permissions.includes('payment:read');
    if (!isOwner && !canRead) {
      throw new NotFoundException('Order not found');
    }
    return order.payment ? toPaymentDto(order.payment) : null;
  }

  // ---- Webhook handler ---------------------------------------------------

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const event = this.stripeProvider.parseWebhook?.(rawBody, signature);
    if (!event) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const isNew = await this.webhookEvents.recordIfNew({
      id: event.id,
      provider: 'stripe',
      type: event.type,
      payload: event.raw,
    });
    if (!isNew) {
      this.logger.log(`Skipping duplicate webhook event ${event.id}`);
      return;
    }

    try {
      await this.dispatchEvent(event);
      await this.webhookEvents.markProcessed(event.id);
    } catch (err) {
      this.logger.error(`Webhook ${event.id} processing failed: ${(err as Error).message}`);
      throw err;
    }
  }

  // ---- Internal ----------------------------------------------------------

  private pickProvider(
    provider: 'stripe' | 'cod',
    method: PaymentMethodKind,
  ): PaymentProvider {
    const candidate: PaymentProvider =
      provider === 'stripe' ? this.stripeProvider : this.codProvider;
    if (!candidate.supports.includes(method)) {
      throw new BadRequestException(
        `Provider ${provider} does not support method ${method}`,
      );
    }
    return candidate;
  }

  private async confirmOrderFromPayment(order: Order, paymentId: string): Promise<void> {
    // Idempotent + state-safe: the conditional update only matches a still
    // PENDING order, so concurrent duplicate webhook deliveries (or a racing
    // cancel) can't double-confirm, resurrect a terminal order, or enqueue a
    // second receipt.
    const { count } = await this.prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
    if (count === 0) {
      this.logger.log(
        `Order ${order.orderNumber} not PENDING — skipping confirm (payment ${paymentId})`,
      );
      return;
    }
    await this.prisma.orderStatusEvent.create({
      data: { orderId: order.id, status: 'CONFIRMED', note: 'Payment confirmed' },
    });
    this.logger.log(`Order ${order.orderNumber} confirmed via payment ${paymentId}`);
    await this.receiptQueue.add(JOB_RECEIPT_GENERATE, { orderId: order.id });
  }

  private async dispatchEvent(event: ParsedWebhookEvent): Promise<void> {
    if (event.type === 'payment_intent.succeeded') {
      if (!event.paymentIntentId) return;
      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: event.paymentIntentId },
        include: { order: true },
      });
      if (!payment) {
        this.logger.warn(`Webhook ${event.id}: no Payment for intent ${event.paymentIntentId}`);
        return;
      }
      if (payment.status === 'PAID') return; // already processed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID' },
      });
      if (payment.order.status === 'PENDING') {
        await this.confirmOrderFromPayment(payment.order, payment.id);
      }
      return;
    }

    if (event.type === 'payment_intent.payment_failed') {
      if (!event.paymentIntentId) return;
      await this.prisma.payment.updateMany({
        where: { providerRef: event.paymentIntentId },
        data: { status: 'FAILED' },
      });
      return;
    }

    if (event.type === 'charge.refunded') {
      await this.syncDashboardRefund(event);
      return;
    }
  }

  /**
   * Sync a `charge.refunded` event from Stripe. Creates missing `Refund` rows
   * (matching on `Refund.providerRef = stripe refund id`) and transitions the
   * order to REFUNDED if the aggregate refunded amount covers the payment.
   */
  private async syncDashboardRefund(event: ParsedWebhookEvent): Promise<void> {
    if (!event.paymentIntentId) {
      this.logger.warn(`charge.refunded ${event.id}: missing payment_intent`);
      return;
    }
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: event.paymentIntentId },
      include: { refunds: true },
    });
    if (!payment) {
      this.logger.warn(
        `charge.refunded ${event.id}: no Payment for intent ${event.paymentIntentId}`,
      );
      return;
    }

    const known = new Set(
      payment.refunds.map((r) => r.providerRef).filter((v): v is string => !!v),
    );
    const incoming = event.refunds ?? [];

    let createdCount = 0;
    for (const r of incoming) {
      if (known.has(r.id)) continue;
      await this.prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: toDecimal(r.amount),
          reason: r.reason ?? null,
          providerRef: r.id,
        },
      });
      createdCount += 1;
      this.logger.log(
        `[STRIPE_DASHBOARD_REFUND] payment=${payment.id} refund=${r.id} amount=${r.amount}`,
      );
    }

    if (createdCount === 0) {
      this.logger.log(
        `[STRIPE_DASHBOARD_REFUND] payment=${payment.id} all refunds already recorded`,
      );
      return;
    }

    // Recompute aggregate refunded total and update payment + order accordingly.
    const refundsAfter = await this.prisma.refund.findMany({
      where: { paymentId: payment.id },
    });
    const totalRefunded = addAll(refundsAfter.map((r) => r.amount));
    const fullRefund = totalRefunded.gte(payment.amount);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: fullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
    });

    if (fullRefund) {
      try {
        await this.orders.forceTransition(
          payment.orderId,
          'REFUNDED',
          null,
          'Refunded via Stripe dashboard',
        );
      } catch (err) {
        // State machine rejects transitions from terminal states. Log and
        // continue — the Refund rows are still persisted, which is the goal.
        this.logger.warn(
          `[STRIPE_DASHBOARD_REFUND] could not transition order ${payment.orderId}: ${(err as Error).message}`,
        );
      }
    }
  }
}

function toPaymentDto(row: Payment): PaymentDto {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    providerRef: row.providerRef,
    method: row.method as PaymentMethodKind,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRefundDto(row: Refund): RefundDto {
  return {
    id: row.id,
    paymentId: row.paymentId,
    amount: row.amount.toFixed(2),
    reason: row.reason,
    providerRef: row.providerRef,
    createdAt: row.createdAt.toISOString(),
  };
}

// Side-effect-free unused-import guard for Decimal (used by addAll above).
const _DecimalGuard = Decimal;
void _DecimalGuard;
