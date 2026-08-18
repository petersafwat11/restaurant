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
import { EserviceProvider, type EserviceReturnVerificationInput } from './eservice.provider';
import { mapTransactionStatus } from './eservice-status';
import type { ParsedWebhookEvent, PaymentProvider } from './provider.interface';
import { CodProvider } from './providers/cod.provider';
import { reconcileAction } from './reconcile';
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
    private readonly eserviceProvider: EserviceProvider,
    private readonly codProvider: CodProvider,
    private readonly webhookEvents: WebhookEventsService,
    private readonly orders: OrdersService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  async getConfig(): Promise<PaymentConfigDto> {
    // Source the currency from the restaurant record so the payment config never
    // drifts from the currency orders are actually charged in.
    const restaurant = await this.prisma.restaurant.findFirst({ select: { currency: true } });
    return {
      currency: restaurant?.currency ?? 'PLN',
      // Online (card/BLIK) payments are available only when eService is
      // configured; in stub mode the storefront should offer COD only.
      onlinePaymentsEnabled: !this.eserviceProvider.stubMode,
    };
  }

  verifyEserviceReturnNotification(input: EserviceReturnVerificationInput): boolean {
    return this.eserviceProvider.verifyReturnNotification(input);
  }

  /**
   * HTML the eService HPP renders at `return_url` after payment. eService needs a
   * publicly reachable return URL that contains "basic HTML and JavaScript" — it
   * can't reach `localhost`, so the return URL points at this (tunnelled) API and
   * we bounce the customer's TOP-level browser window to the web app, which the
   * browser itself can reach. `window.top` breaks out of any iframe eService uses.
   */
  buildReturnRedirectHtml(orderId: string | undefined, status: string | undefined): string {
    const web = this.env.APP_URL_WEB.replace(/\/$/, '');
    const failed = ['DECLINED', 'CANCELLED', 'EXPIRED', 'ERROR', 'REJECTED'].includes(
      (status ?? '').toUpperCase(),
    );
    const target = !orderId
      ? `${web}/menu`
      : failed
        ? `${web}/checkout`
        : `${web}/checkout/return?orderId=${encodeURIComponent(orderId)}`;
    const safe = JSON.stringify(target);
    return `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:2rem;color:#444">Finalizing your payment…<script>window.top.location.href=${safe};</script><noscript><a href=${safe}>Continue</a></noscript></body></html>`;
  }

  /**
   * Confirm an eService order from the provider's authoritative record. Called on
   * the HPP return so the order settles instantly, without waiting for the
   * status_url webhook (which can be delayed or, in some eService configs,
   * undelivered). Idempotent; the 15-min reconcile job is the backstop for
   * customers who never return.
   *
   * @returns the authoritative local outcome: paid, failed, still pending, or
   *   ignored when the order has no eService payment to synchronize.
   */
  async syncEserviceOrderFromProvider(
    orderId: string,
  ): Promise<'paid' | 'failed' | 'pending' | 'ignored'> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      include: { order: true },
    });
    if (!payment || payment.provider !== 'eservice' || !payment.providerRef) return 'ignored';
    if (['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)) return 'paid';

    const txn = await this.eserviceProvider.retrieveTransaction(payment.providerRef);
    const providerStatus = mapTransactionStatus(txn?.status);
    if (providerStatus === 'failed' || providerStatus === 'canceled') {
      await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        },
        data: { status: 'FAILED', ...(txn?.id ? { providerTxnId: txn.id } : {}) },
      });
      return 'failed';
    }
    if (providerStatus !== 'succeeded') return 'pending';

    // Settle the payment (never clobber an already-terminal row) and persist the
    // TRN id so refunds have a target, then confirm the order through the FSM.
    const { count } = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
      data: { status: 'PAID', providerTxnId: txn?.id ?? payment.providerTxnId },
    });
    if (count > 0 && payment.order.status === 'PENDING') {
      await this.confirmOrderFromPayment(payment.order, payment.id);
      this.logger.log(`Order ${payment.order.orderNumber} settled on return (payment ${payment.id})`);
    }
    return 'paid';
  }

  /**
   * Background poll for the HPP return: eService CAPTURE can lag the browser
   * return by tens of seconds, so if the synchronous settle finds the transaction
   * not yet captured, keep trying for ~1 minute. That confirms the order (and
   * clears its cart, via confirmPendingOrder) promptly instead of waiting for the
   * 15-min reconcile. Called fire-and-forget; the reconcile job stays the final
   * backstop. Never throws — every attempt is guarded.
   */
  async retrySyncEserviceOrder(orderId: string): Promise<void> {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      try {
        const result = await this.syncEserviceOrderFromProvider(orderId);
        if (result !== 'pending') return;
      } catch (err) {
        this.logger.warn(
          `Background settle retry for order ${orderId} failed: ${(err as Error).message}`,
        );
      }
    }
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

    // Terminal payment states can never be re-intented (plan §F2). Check this
    // BEFORE the order-status guard: a paid order is also CONFIRMED, and the
    // clear "already paid" reason is more useful (and matches §F2) than the
    // generic "not pending".
    const existing = order.payment;
    if (existing && ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(existing.status)) {
      throw new BadRequestException(`Order payment is already ${existing.status.toLowerCase()}`);
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order is not pending (status: ${order.status})`);
    }

    const provider = this.pickProvider(dto.provider, dto.methodKind);

    // Same-method retry reuse (plan §F2): the customer re-opened checkout for
    // the same method and we already minted an HPP link that's still open. Reuse
    // it verbatim — no new eService link, no new reference — so the redirect URL
    // is stable across refreshes and we don't leave orphaned links behind.
    if (
      provider.id === 'eservice' &&
      existing?.provider === 'eservice' &&
      existing.status === 'PENDING' &&
      existing.method === dto.methodKind &&
      existing.providerRedirectUrl
    ) {
      return {
        paymentId: existing.id,
        provider: provider.id,
        status: existing.status,
        redirectUrl: existing.providerRedirectUrl,
        confirmed: false,
      };
    }

    // Method switch (e.g. card → BLIK): the old HPP link is method-specific and
    // can't be paid the new way, so expire it before creating a fresh one (plan
    // §F2). The expire endpoint targets the LNK id (providerLinkId), not our
    // reference.
    if (
      provider.id === 'eservice' &&
      existing?.provider === 'eservice' &&
      existing.status === 'PENDING' &&
      existing.providerLinkId &&
      existing.method !== dto.methodKind
    ) {
      await provider.cancelIntent?.(existing.providerLinkId);
    }

    const amount = order.grandTotal.toFixed(2);

    // Reconcilable metadata (plan §F2). Payer name/email feed the HPP payer
    // block; the rest is PII-free reconciliation context. Only include the payer
    // keys when present so the map stays a clean Record<string, string>.
    const metadata: Record<string, string> = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      environment: this.env.NODE_ENV ?? 'unknown',
    };
    // eService's HPP requires a payer email (HPP_CUSTOMER_EMAIL). Prefer the
    // order's guest contact snapshot; fall back to the authed user's email/name
    // so logged-in orders (which may not snapshot contact fields) still supply one.
    let payerEmail = order.customerEmail;
    let payerName = order.customerName;
    if ((!payerEmail || !payerName) && order.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true, firstName: true, lastName: true },
      });
      payerEmail = payerEmail ?? user?.email ?? null;
      payerName =
        payerName ?? (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null : null);
    }
    if (provider.id === 'eservice' && !payerEmail) {
      throw new BadRequestException('A customer email is required for online payment.');
    }
    if (payerName) metadata.payerName = payerName;
    if (payerEmail) metadata.payerEmail = payerEmail;
    if (order.checkoutLocale) metadata.language = order.checkoutLocale;

    const intent = await provider.createIntent({
      orderId: order.id,
      amount,
      currency: order.currency,
      methodKind: dto.methodKind,
      metadata,
    });

    const data = {
      provider: provider.id,
      providerRef: intent.providerRef,
      providerLinkId: intent.linkId ?? null,
      providerRedirectUrl: intent.redirectUrl,
      // A fresh attempt must never inherit the transaction id of an earlier
      // failed/expired method. eService refunds target this exact TRN id.
      providerTxnId: null,
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
        // Lost the create race to a concurrent request (unique on orderId) —
        // fall through to the same conditional update path, which overwrites the
        // ref/link/redirect with this attempt's values without clobbering a PAID
        // row.
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
    // events the eService webhook would, so the notification dispatcher can
    // listen on a single channel.
    if (intent.confirmed) {
      await this.confirmOrderFromPayment(order, payment.id);
    }

    return {
      paymentId: payment.id,
      provider: provider.id,
      status: payment.status,
      // eService: the HPP redirect URL the browser is sent to. null for COD.
      redirectUrl: intent.redirectUrl,
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
    // eService refunds target the settled transaction (TRN), which we only learn
    // once a capture webhook (or reconcile) lands. Without it there is nothing to
    // refund yet — surface a clear reason rather than calling with a null id. COD
    // has no transaction and refunds are DB-only, so it is exempt.
    if (payment.provider === 'eservice' && !payment.providerTxnId) {
      throw new BadRequestException('Payment is not refundable until captured');
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

    const provider = this.pickProvider(
      payment.provider as 'eservice' | 'cod',
      payment.method as PaymentMethodKind,
    );
    // eService refunds go against the transaction id (providerTxnId, guarded
    // above); COD refunds are DB-only and ignore the ref, so fall back to
    // providerRef for it.
    const refundTarget =
      payment.provider === 'eservice'
        ? (payment.providerTxnId as string)
        : (payment.providerRef ?? payment.id);
    const result = await provider.refund({
      providerRef: refundTarget,
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

  async handleEserviceWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const event = this.eserviceProvider.parseWebhook?.(rawBody, signature);
    if (!event) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const isNew = await this.webhookEvents.recordIfNew({
      id: event.id,
      provider: 'eservice',
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
   * Reconcile non-terminal eService payments against the provider. Repairs rows
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
        provider: 'eservice',
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
      // Fetch the settled transaction (id + status) in one call. We need the
      // status to decide the action AND the TRN id to persist on repair — eService
      // refunds target the transaction, so a row we settle here from a *missed
      // webhook* must carry providerTxnId or a later refund is blocked (see the
      // refund guard). `mapTransactionStatus(undefined)` is null, matching the
      // previous `retrieveIntentStatus` "couldn't determine → leave" behaviour.
      const txn = await this.eserviceProvider.retrieveTransaction(payment.providerRef);
      const status = mapTransactionStatus(txn?.status);
      checked += 1;
      const expired = payment.updatedAt.getTime() <= Date.now() - 24 * 60 * 60_000;
      const action = reconcileAction(status, payment.status as PaymentStatus, expired);

      if (action === 'mark_paid') {
        const { count } = await this.prisma.payment.updateMany({
          where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
          data: { status: 'PAID', ...(txn?.id ? { providerTxnId: txn.id } : {}) },
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
          this.logger.warn(
            `[RECONCILE] payment ${payment.id} → FAILED ` +
              `(eservice: ${status}, finalAfterExpiry: ${expired})`,
          );
          if (payment.order.status === 'PENDING') {
            try {
              await this.orders.forceTransition(
                payment.order.id,
                'CANCELLED',
                null,
                'Online payment expired or failed',
              );
            } catch (err) {
              this.logger.warn(`Could not cancel unpaid order ${payment.order.id}: ${(err as Error).message}`);
            }
          }
        }
      } else if (action === 'attention') {
        attention += 1;
        this.logger.error(
          `[RECONCILE] payment ${payment.id} unexpected eservice status: ${status}`,
        );
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
    provider: 'eservice' | 'cod',
    method: PaymentMethodKind,
  ): PaymentProvider {
    const candidate: PaymentProvider =
      provider === 'eservice' ? this.eserviceProvider : this.codProvider;
    if (!candidate.supports.includes(method)) {
      throw new BadRequestException(
        `Provider ${provider} does not support method ${method}`,
      );
    }
    return candidate;
  }

  private async confirmOrderFromPayment(order: Order, paymentId: string): Promise<void> {
    // Delegate to OrdersService so the payment-driven confirm (eService webhook /
    // COD intent) and the COD-at-checkout path share one implementation:
    // idempotent PENDING→CONFIRMED guard, status event, receipt enqueue.
    const confirmed = await this.orders.confirmPendingOrder(order.id, 'Payment confirmed');
    if (confirmed) {
      this.logger.log(`Order ${order.orderNumber} confirmed via payment ${paymentId}`);
    }
  }

  private async dispatchEvent(event: ParsedWebhookEvent): Promise<void> {
    if (event.type === 'payment.succeeded') {
      if (!event.providerRef) return;
      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: event.providerRef },
        include: { order: true },
      });
      if (!payment) {
        this.logger.warn(`Webhook ${event.id}: no Payment for reference ${event.providerRef}`);
        return;
      }
      // Only settle a non-terminal payment — never flip an already-PAID or
      // refunded row back to PAID (out-of-order / duplicate delivery safety,
      // symmetric with the failed guard below). Idempotent: an already-settled
      // row matches 0 and skips the confirm. Persist the TRN id so refunds
      // (which target the transaction) have a handle.
      const { count } = await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
        data: {
          status: 'PAID',
          ...(event.transactionId ? { providerTxnId: event.transactionId } : {}),
        },
      });
      if (count > 0 && payment.order.status === 'PENDING') {
        await this.confirmOrderFromPayment(payment.order, payment.id);
      }
      return;
    }

    if (event.type === 'payment.failed') {
      if (!event.providerRef) return;
      // Guard against out-of-order delivery: a late failed event must never
      // clobber an already-settled (PAID/refunded) payment (plan §F6).
      await this.prisma.payment.updateMany({
        where: {
          providerRef: event.providerRef,
          status: { notIn: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
        },
        data: { status: 'FAILED' },
      });
      return;
    }

    if (event.type === 'payment.refunded') {
      await this.syncDashboardRefund(event);
      return;
    }
  }

  /**
   * Sync a refund notification from eService (e.g. a refund issued from the
   * eService dashboard). Creates missing `Refund` rows (matching on
   * `Refund.providerRef = eService refund id`) and transitions the order to
   * REFUNDED if the aggregate refunded amount covers the payment. Matched by our
   * `reference` (providerRef), like the succeeded/failed paths.
   *
   * TODO(verify): confirm eService refund-notification field names against a
   * live sample — the refund detail shape (see `parseNotification`) was not
   * captured live during integration.
   */
  private async syncDashboardRefund(event: ParsedWebhookEvent): Promise<void> {
    if (!event.providerRef) {
      this.logger.warn(`payment.refunded ${event.id}: missing reference`);
      return;
    }
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: event.providerRef },
      include: { refunds: true },
    });
    if (!payment) {
      this.logger.warn(
        `payment.refunded ${event.id}: no Payment for reference ${event.providerRef}`,
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
        `[ESERVICE_DASHBOARD_REFUND] payment=${payment.id} refund=${r.id} amount=${r.amount}`,
      );
    }

    if (createdCount === 0) {
      this.logger.log(
        `[ESERVICE_DASHBOARD_REFUND] payment=${payment.id} all refunds already recorded`,
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
          'Refunded via eService dashboard',
        );
      } catch (err) {
        // State machine rejects transitions from terminal states. Log and
        // continue — the Refund rows are still persisted, which is the goal.
        this.logger.warn(
          `[ESERVICE_DASHBOARD_REFUND] could not transition order ${payment.orderId}: ${(err as Error).message}`,
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
