import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Order, Payment, Refund } from '@repo/db';
import { JOB_EMAIL_REFUND, QUEUE_EMAIL } from '@repo/jobs';
import { captureException } from '@repo/observability';
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
import { addAll, clampNonNegative, decimalToString, toDecimal } from '@repo/utils/money';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { verifyOrderTrackingToken } from '../orders/order-tracking-token';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ParsedWebhookEvent, PaymentProvider } from './provider.interface';
import { CodProvider } from './providers/cod.provider';
import { StripeProvider } from './providers/stripe.provider';
import { reconcileAction } from './reconcile';
import { stripeIntentIdempotencyKey } from './stripe-intent';
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
    orderToken?: string | null,
  ): Promise<PaymentIntentResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // F1 — authorize by the authed owner OR a valid signed token bound to this
    // exact order. A session key / order UUID alone is never accepted.
    this.authorizeOrderAccess(order, actor, orderToken);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is not pending (status: ${order.status})`);
    }
    // Terminal payment states can never be re-intented (plan §F2).
    const existing = order.payment;
    if (existing && ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(existing.status)) {
      throw new BadRequestException(`Order payment is already ${existing.status.toLowerCase()}`);
    }

    const provider = this.pickProvider(dto.provider, dto.methodKind);

    // Method switch (e.g. card → BLIK): the old intent is method-specific and
    // can't be confirmed the new way, so cancel it before creating a fresh one
    // (plan §F2). Same-method retries reuse via the deterministic key below.
    if (
      provider.id === 'stripe' &&
      existing?.provider === 'stripe' &&
      existing.status === 'PENDING' &&
      existing.providerRef &&
      existing.method !== dto.methodKind
    ) {
      await provider.cancelIntent?.(existing.providerRef);
    }

    const amount = order.grandTotal.toFixed(2);
    const idempotencyKey =
      provider.id === 'stripe'
        ? stripeIntentIdempotencyKey({
            orderId: order.id,
            methodKind: dto.methodKind,
            amount,
            currency: order.currency,
          })
        : undefined;

    const intent = await provider.createIntent({
      orderId: order.id,
      amount,
      currency: order.currency,
      methodKind: dto.methodKind,
      // Reconcilable, PII-free metadata (plan §F2).
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        environment: this.env.NODE_ENV ?? 'unknown',
      },
      idempotencyKey,
    });

    const data = {
      provider: provider.id,
      providerRef: intent.providerRef,
      method: dto.methodKind,
      amount: order.grandTotal,
      currency: order.currency,
      status: (intent.confirmed ? 'PAID' : 'PENDING') as PaymentStatus,
    };

    // Write the payment row without ever clobbering a PAID one. The
    // `status: { not: 'PAID' }` guard closes the TOCTOU window where a webhook
    // flips the row PAID between our read above and this write (plan §F2).
    if (!existing) {
      try {
        await this.prisma.payment.create({ data: { orderId: order.id, ...data } });
      } catch (err) {
        // Lost the create race to a concurrent request — fall through to the
        // same conditional update path (both carry the same providerRef via the
        // deterministic idempotency key).
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
          throw err;
        }
        this.assertNotAlreadyPaid(
          await this.prisma.payment.updateMany({
            where: { orderId: order.id, status: { not: 'PAID' } },
            data,
          }),
        );
      }
    } else {
      this.assertNotAlreadyPaid(
        await this.prisma.payment.updateMany({
          where: { orderId: order.id, status: { not: 'PAID' } },
          data,
        }),
      );
    }

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { orderId: order.id },
    });

    // COD short-circuits: confirm the order immediately and emit the same
    // events the Stripe webhook would, so the notification dispatcher can listen
    // on a single channel.
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

  /**
   * Authorize access to an order for payment create / status recovery (plan
   * §F1): either the authed owner, a staff member with `payment:read`, or a
   * valid unexpired signed token whose embedded order id matches. Never accepts
   * a raw order UUID or session key alone.
   */
  private authorizeOrderAccess(
    order: { id: string; userId: string | null },
    actor: PaymentActor,
    orderToken?: string | null,
  ): void {
    if (actor.userId && order.userId === actor.userId) return;
    if (actor.permissions.includes('payment:read')) return;
    if (orderToken) {
      const verified = verifyOrderTrackingToken(orderToken);
      if (verified.ok && verified.orderId === order.id) return;
    }
    throw new ForbiddenException('Not your order');
  }

  private assertNotAlreadyPaid(result: { count: number }): void {
    if (result.count === 0) {
      // The only row not matched by `status != 'PAID'` is a PAID one.
      throw new BadRequestException('Order is already paid');
    }
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

    // Enqueue the refund-confirmation email. Prefer the registered user's email,
    // else the immutable guest contact snapshot on the order (plan §C1) so guest
    // refunds are emailed too.
    const customer = payment.order.userId
      ? await this.prisma.user.findUnique({
          where: { id: payment.order.userId },
          select: { email: true },
        })
      : null;
    const recipientEmail = customer?.email ?? payment.order.customerEmail;
    if (recipientEmail) {
      await this.emailQueue.add(JOB_EMAIL_REFUND, {
        orderId: payment.orderId,
        to: recipientEmail,
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

  async byOrderId(
    actor: PaymentActor,
    orderId: string,
    orderToken?: string | null,
  ): Promise<PaymentDto | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = actor.userId !== null && order.userId === actor.userId;
    const canRead = actor.permissions.includes('payment:read');
    const tokenOk = orderToken
      ? (() => {
          const v = verifyOrderTrackingToken(orderToken);
          return v.ok && v.orderId === order.id;
        })()
      : false;
    // 404 (not 403) when unauthorized so we don't leak order existence.
    if (!isOwner && !canRead && !tokenOk) {
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

  // ---- Reconciliation (plan §F6) -----------------------------------------

  /**
   * Reconcile non-terminal Stripe payments against the provider. Repairs rows
   * where a webhook was missed (provider succeeded → PAID + confirm order) or
   * the intent died (canceled/failed → FAILED), and alerts on anything
   * unexpected. Status-guarded + idempotent, so safe to run on a schedule.
   * In stub mode the provider returns no status, so this is a no-op.
   */
  async reconcilePayments(
    opts: { olderThanMinutes?: number; limit?: number } = {},
  ): Promise<{ checked: number; repaired: number; attention: number }> {
    const cutoff = new Date(Date.now() - (opts.olderThanMinutes ?? 15) * 60_000);
    const stale = await this.prisma.payment.findMany({
      where: {
        provider: 'stripe',
        status: { in: ['PENDING', 'AUTHORIZED'] },
        // Only rows that have sat un-settled past the grace window — avoids
        // racing an intent the customer is actively completing.
        updatedAt: { lt: cutoff },
      },
      include: { order: true },
      take: opts.limit ?? 100,
    });

    let checked = 0;
    let repaired = 0;
    let attention = 0;

    for (const payment of stale) {
      if (!payment.providerRef) continue;
      const status = (await this.stripeProvider.retrieveIntentStatus?.(payment.providerRef)) ?? null;
      checked += 1;
      const action = reconcileAction(status, payment.status as PaymentStatus);

      if (action === 'mark_paid') {
        const { count } = await this.prisma.payment.updateMany({
          where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
          data: { status: 'PAID' },
        });
        if (count > 0) {
          repaired += 1;
          this.logger.warn(`[RECONCILE] payment ${payment.id} → PAID (missed webhook)`);
          if (payment.order.status === 'PENDING') {
            await this.confirmOrderFromPayment(payment.order, payment.id);
          }
        }
      } else if (action === 'mark_failed') {
        const { count } = await this.prisma.payment.updateMany({
          where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
          data: { status: 'FAILED' },
        });
        if (count > 0) {
          repaired += 1;
          this.logger.warn(`[RECONCILE] payment ${payment.id} → FAILED (stripe: ${status})`);
        }
      } else if (action === 'attention') {
        attention += 1;
        this.logger.error(`[RECONCILE] payment ${payment.id} unexpected stripe status: ${status}`);
      }
    }

    if (attention > 0) {
      captureException(
        new Error(`Payment reconciliation flagged ${attention} payment(s) for review`),
        { checked, repaired, attention },
      );
    }
    return { checked, repaired, attention };
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
    // Delegate to OrdersService so the payment-driven confirm (Stripe webhook /
    // COD intent) and the COD-at-checkout path share one implementation:
    // idempotent PENDING→CONFIRMED guard, status event, receipt enqueue.
    const confirmed = await this.orders.confirmPendingOrder(order.id, 'Payment confirmed');
    if (confirmed) {
      this.logger.log(`Order ${order.orderNumber} confirmed via payment ${paymentId}`);
    }
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
      // Only settle a non-terminal payment — never flip an already-PAID or
      // refunded row back to PAID (out-of-order / duplicate delivery safety,
      // symmetric with the failed/canceled guard below). Idempotent: an
      // already-settled row matches 0 and skips the confirm.
      const { count } = await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
        data: { status: 'PAID' },
      });
      if (count > 0 && payment.order.status === 'PENDING') {
        await this.confirmOrderFromPayment(payment.order, payment.id);
      }
      return;
    }

    if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      if (!event.paymentIntentId) return;
      // Guard against out-of-order delivery: a late failed/canceled event must
      // never clobber an already-settled (PAID/refunded) payment (plan §F6).
      await this.prisma.payment.updateMany({
        where: {
          providerRef: event.paymentIntentId,
          status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        },
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
