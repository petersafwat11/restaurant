import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@repo/db';
import type { Order, OrderItem, OrderStatusEvent } from '@repo/db';
import {
  JOB_ORDER_AUTO_COMPLETE,
  JOB_RECEIPT_GENERATE,
  QUEUE_ORDERS,
  QUEUE_RECEIPT,
} from '@repo/jobs';
import { LEGAL_BUNDLE_VERSION, LEGAL_VERSION_CHANGED } from '@repo/types';
import type { Queue } from 'bullmq';
import type {
  CheckoutQuoteDto,
  CheckoutQuoteRequestDto,
  CreateOrderDto,
  GeoPointDto,
  ModifierSnapshotEntry,
  OrderCreatedEvent,
  OrderCustomerDto,
  OrderDto,
  OrderExportQuery,
  OrderListDto,
  OrderListItemDto,
  OrderListQuery,
  OrderPaymentDto,
  OrderStatusChangedEvent,
  OrderTrackingDto,
  OrderType,
  PaymentMethodKind,
} from '@repo/types';
import { Decimal, addAll, decimalToString, multiply, toDecimal } from '@repo/utils/money';
import { isWithinRadiusKm } from '@repo/utils';
import {
  CSV_CONTENT_TYPE,
  PDF_CONTENT_TYPE,
  assertWithinRowCap,
  buildCsv,
  buildPdf,
  exportFilename,
} from '../common/table-export';
import { buildSearchWhere } from '../common/table-search/build-search-where';
import { AnalyticsProductService } from '../analytics-product/analytics-product.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { IdempotencyService } from './idempotency.service';
import { buildLegalSnapshot, hashLegalSnapshot } from './legal-snapshot';
import { OrderNumberService } from './order-number';
import { type ActorRole, actorRoleFor, canTransition } from './order-state-machine';
import { computeEta, isTerminalStatus } from './order-tracking';
import { signOrderTrackingToken } from './order-tracking-token';
import { ORDER_EXPORT_COLUMNS, type OrderExportRow } from './orders.export-columns';
import { ORDER_SEARCH_DESCRIPTORS } from './orders.search-descriptor';

interface OrderActor {
  userId: string | null;
  sessionKey: string | null;
  permissions: string[];
  roles?: string[];
}

// Grace window before a DELIVERED order auto-archives to COMPLETED. Deliberately
// in the "hours" range, not minutes: while an order is DELIVERED it stays
// refundable via the normal flow (a COMPLETED order is not), so this window also
// serves as the post-delivery refund window. Staff never click "Complete" — the
// order-auto-complete worker does it. One constant to tune (or lift to env later).
const AUTO_COMPLETE_GRACE_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly orderNumber: OrderNumberService,
    private readonly idempotency: IdempotencyService,
    private readonly pricing: PricingService,
    private readonly loyalty: LoyaltyService,
    private readonly analytics: AnalyticsProductService,
    private readonly events: EventEmitter2,
    @InjectQueue(QUEUE_RECEIPT) private readonly receiptQueue: Queue,
    @InjectQueue(QUEUE_ORDERS) private readonly ordersQueue: Queue,
  ) {}

  // ---- Shared checkout pricing -------------------------------------------

  /**
   * Server-authoritative pricing shared by the checkout quote and order
   * creation. Loads the caller's cart, re-validates each line's existence +
   * availability against the live menu (and refreshes the name snapshot),
   * re-validates the applied coupon, quotes loyalty redemption, and runs the
   * single `PricingService.calculateTotals` calculator. Both `create()` and
   * `quote()` call this so the displayed total and the charged total cannot
   * diverge (plan §3.4 — never a second checkout calculator).
   *
   * NOTE on price: the line `unitPrice` is the server-set price captured at
   * add-to-cart time (cart.service derives it from the live menu then) — it is
   * intentionally NOT re-derived here, so the price is "locked when added". This
   * never trusts a client price and never mischarges (quote and create read the
   * same cart price); the only effect is that a later admin menu-price change is
   * not retro-applied to an in-flight cart.
   */
  private async priceCheckout(
    actor: OrderActor,
    input: { type: OrderType; tipAmount: string; sessionKey?: string | null },
  ) {
    const restaurantRow = await this.prisma.restaurant.findFirst({
      select: {
        id: true,
        name: true,
        currency: true,
        geoPoint: true,
        deliveryRadiusKm: true,
        minOrderAmount: true,
        defaultDeliveryFee: true,
        // Legal-snapshot inputs — only consumed by create(); harmless to load
        // for quote() (all are public legal/commercial fields anyway).
        address: true,
        legalName: true,
        nip: true,
        krs: true,
        regon: true,
        registryCourt: true,
        shareCapital: true,
        shareCapitalCurrency: true,
        registeredAddress: true,
        registeredAddressSameAsTrading: true,
        supportEmail: true,
        supportPhone: true,
        complaintsEmail: true,
        privacyEmail: true,
        estimatedDeliveryMinutesMin: true,
        estimatedDeliveryMinutesMax: true,
        estimatedPickupMinutesMin: true,
        estimatedPickupMinutesMax: true,
      },
    });
    if (!restaurantRow) throw new BadRequestException('Restaurant not configured');

    // Load the caller's cart (server-side authoritative).
    const cart = await this.prisma.cart.findFirst({
      where: actor.userId
        ? { userId: actor.userId }
        : { sessionKey: input.sessionKey ?? actor.sessionKey ?? '' },
      include: {
        items: true,
        appliedPromotion: true,
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Re-validate each line against the live menu.
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: cart.items.map((it) => it.menuItemId) } },
    });
    const menuById = new Map(menuItems.map((m) => [m.id, m]));

    const lineSnapshots: {
      menuItemId: string;
      nameSnapshot: string;
      quantity: number;
      unitPrice: Decimal;
      lineTotal: Decimal;
      modifierSnapshot: ModifierSnapshotEntry[];
      notes: string | null;
    }[] = [];

    for (const it of cart.items) {
      const menuItem = menuById.get(it.menuItemId);
      if (!menuItem) {
        throw new BadRequestException(`Menu item ${it.menuItemId} no longer exists`);
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`${menuItem.name} is no longer available`);
      }
      const snapshot = it.modifierSnapshot as unknown as ModifierSnapshotEntry[];
      const lineTotal = multiply(it.unitPrice, it.quantity);
      lineSnapshots.push({
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        quantity: it.quantity,
        unitPrice: toDecimal(it.unitPrice),
        lineTotal,
        modifierSnapshot: snapshot,
        notes: it.notes,
      });
    }

    const subtotalPreview = addAll(lineSnapshots.map((l) => l.lineTotal));

    // Coupon: re-validate at order time.
    let couponDiscount = toDecimal(0);
    let couponCode: string | null = null;
    let couponRedemption: { promotionId: string } | null = null;
    if (cart.appliedPromotion?.code) {
      const result = await this.promotions.validate({
        code: cart.appliedPromotion.code,
        subtotal: decimalToString(subtotalPreview),
        userId: actor.userId ?? undefined,
      });
      if (!result.valid) {
        throw new BadRequestException(`Coupon: ${result.message}`);
      }
      couponDiscount = toDecimal(result.discountAmount);
      couponCode = cart.appliedPromotion.code;
      couponRedemption = { promotionId: cart.appliedPromotion.id };
    }

    // Loyalty redemption: server recomputes the discount from the points the
    // customer chose to redeem (cart-stored). Guests cannot redeem. The
    // appliable points are locked here and burned inside the order tx.
    // Quote against the subtotal *after* the coupon so loyalty + coupon can
    // never exceed the subtotal — otherwise pricing would clamp the combined
    // discount while we still burned the full points (lost point value).
    let loyaltyPointsToBurn = 0;
    let loyaltyDiscount = toDecimal(0);
    if (actor.userId && cart.loyaltyPointsToRedeem > 0) {
      const afterCoupon = subtotalPreview.minus(couponDiscount);
      const loyaltyBasis = afterCoupon.lt(0) ? toDecimal(0) : afterCoupon;
      const quote = await this.loyalty.quoteRedemption(
        actor.userId,
        cart.loyaltyPointsToRedeem,
        decimalToString(loyaltyBasis),
      );
      loyaltyPointsToBurn = quote.appliablePoints;
      loyaltyDiscount = toDecimal(quote.discountAmount);
    }

    // Delegate totals math to the shared pricing service (tax + delivery fee
    // pulled from restaurant config). Tip validation lives there too.
    // Coupon + loyalty are both pre-tax discounts.
    let totals;
    try {
      totals = await this.pricing.calculateTotals({
        lines: lineSnapshots.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
        couponDiscount: couponDiscount.plus(loyaltyDiscount),
        tipAmount: input.tipAmount,
        // Flat restaurant-wide fee — only charged for DELIVERY orders.
        deliveryFee: input.type === 'DELIVERY' ? restaurantRow.defaultDeliveryFee.toString() : 0,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    return {
      restaurantRow,
      cart,
      lineSnapshots,
      subtotalPreview,
      couponCode,
      couponDiscount,
      couponRedemption,
      loyaltyPointsToBurn,
      loyaltyDiscount,
      totals,
    };
  }

  /**
   * Read-only checkout price quote — the single source of the totals the
   * checkout summary displays. Reuses `priceCheckout` so the quoted grand total
   * equals what `create()` will charge.
   *
   * Advisory only: the quote takes no address and does NOT enforce the delivery
   * minimum-order or radius (those are checked authoritatively in `create()`).
   * So a below-minimum / out-of-range cart still returns a price here and is
   * rejected at submit — intended for a lightweight summary, never a mischarge.
   */
  async quote(actor: OrderActor, dto: CheckoutQuoteRequestDto): Promise<CheckoutQuoteDto> {
    const { restaurantRow, couponCode, couponDiscount, loyaltyDiscount, totals } =
      await this.priceCheckout(actor, {
        type: dto.type,
        tipAmount: dto.tipAmount,
        sessionKey: dto.sessionKey,
      });
    return {
      subtotal: totals.asStrings.subtotal,
      couponDiscount: decimalToString(couponDiscount),
      loyaltyDiscount: decimalToString(loyaltyDiscount),
      discountTotal: totals.asStrings.discountTotal,
      deliveryFee: totals.asStrings.deliveryFee,
      taxTotal: totals.asStrings.taxTotal,
      tipAmount: totals.asStrings.tipAmount,
      grandTotal: totals.asStrings.grandTotal,
      currency: restaurantRow.currency,
      couponCode,
      orderType: dto.type,
      quotedAt: new Date().toISOString(),
    };
  }

  // ---- Create ------------------------------------------------------------

  async create(actor: OrderActor, idempotencyKey: string, dto: CreateOrderDto): Promise<OrderDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const scope = actor.userId ?? actor.sessionKey ?? '';
    if (!scope) {
      throw new BadRequestException('Auth or sessionKey required to place an order');
    }

    const existingOrderId = await this.idempotency.get(scope, idempotencyKey);
    if (existingOrderId) {
      return this.getById(actor, existingOrderId);
    }

    // Durable legal acceptance (plan §C2): reject a stale bundle version with a
    // typed conflict so the client can refresh the policy text and re-accept.
    // The server — never the client — owns the acceptance timestamp + snapshot.
    if (dto.legalBundleVersion !== LEGAL_BUNDLE_VERSION) {
      throw new ConflictException({
        code: LEGAL_VERSION_CHANGED,
        message: 'The terms changed since you opened checkout. Please review and accept again.',
        details: { currentVersion: LEGAL_BUNDLE_VERSION },
      });
    }

    // Guest checkout must carry contact details — there's no User row to email a
    // receipt/notification to (plan §C1). Authed orders may omit it; the read
    // path then falls back to the user row.
    if (!actor.userId && !dto.contact) {
      throw new BadRequestException(
        'Contact name, email and phone are required for guest checkout',
      );
    }

    const {
      restaurantRow,
      cart,
      lineSnapshots,
      subtotalPreview,
      couponCode,
      couponDiscount,
      couponRedemption,
      loyaltyPointsToBurn,
      loyaltyDiscount,
      totals,
    } = await this.priceCheckout(actor, {
      type: dto.type,
      tipAmount: dto.tipAmount ?? '0',
      sessionKey: dto.sessionKey,
    });

    const { subtotal, taxTotal, deliveryFee, tipAmount, discountTotal, grandTotal } = totals;

    let deliveryAddress: Prisma.InputJsonValue | null = null;
    if (dto.type === 'DELIVERY') {
      // 1. Resolve the address (saved or inline) → flat snapshot with geoPoint.
      let snapshot: {
        line1: string;
        line2: string | null;
        city: string;
        state: string | null;
        country: string;
        geoPoint: GeoPointDto;
      } | null = null;

      if (dto.deliveryAddressId) {
        if (!actor.userId) {
          throw new BadRequestException(
            'Saved delivery addresses require a signed-in user; guests must pass inline deliveryAddress',
          );
        }
        const addr = await this.prisma.userAddress.findFirst({
          where: { id: dto.deliveryAddressId, userId: actor.userId },
        });
        if (!addr) throw new NotFoundException('Delivery address not found');
        const geo = addr.geoPoint as GeoPointDto | null;
        if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
          throw new BadRequestException(
            'Saved address is missing a map pin — re-save it from your account.',
          );
        }
        snapshot = {
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          geoPoint: geo,
        };
      } else if (dto.deliveryAddress) {
        snapshot = {
          line1: dto.deliveryAddress.line1,
          line2: dto.deliveryAddress.line2 ?? null,
          city: dto.deliveryAddress.city,
          state: dto.deliveryAddress.state ?? null,
          country: dto.deliveryAddress.country,
          geoPoint: dto.deliveryAddress.geoPoint,
        };
      }

      if (!snapshot) {
        throw new BadRequestException('Delivery address required');
      }

      // 2. Re-validate the pin against the restaurant's delivery radius. The
      //    client also checks, but we never trust client values. If the
      //    restaurant has no geoPoint configured, we can't enforce a radius —
      //    mirror the old "no zones → no restriction" behaviour.
      const restaurantGeo = restaurantRow.geoPoint as GeoPointDto | null;
      if (restaurantGeo) {
        const inRange = isWithinRadiusKm(
          restaurantGeo,
          { lat: snapshot.geoPoint.lat, lng: snapshot.geoPoint.lng },
          restaurantRow.deliveryRadiusKm,
        );
        if (!inRange) {
          throw new BadRequestException(
            'Address is outside our delivery area — choose pickup or a different address.',
          );
        }
      }

      // 3. Enforce restaurant-wide minimum order.
      const minOrder = toDecimal(restaurantRow.minOrderAmount.toString());
      if (minOrder.gt(0) && subtotalPreview.lt(minOrder)) {
        throw new BadRequestException(
          `Minimum order for delivery is ${minOrder.toFixed(2)} — add a bit more.`,
        );
      }

      deliveryAddress = snapshot as unknown as Prisma.InputJsonValue;
    }

    // Build the durable, server-generated legal-acceptance evidence (plan §C2):
    // an immutable snapshot of the exact seller identity + commercial terms the
    // customer accepted, plus its SHA-256 hash. The client cannot influence the
    // timestamp or the hash.
    const legalAcceptedAt = new Date();
    const legalSnapshot = buildLegalSnapshot({
      acceptedAt: legalAcceptedAt.toISOString(),
      locale: dto.checkoutLocale,
      orderType: dto.type,
      currency: restaurantRow.currency,
      restaurant: {
        name: restaurantRow.name,
        address: restaurantRow.address as Record<string, unknown> | null,
        legalName: restaurantRow.legalName,
        nip: restaurantRow.nip,
        krs: restaurantRow.krs,
        regon: restaurantRow.regon,
        registryCourt: restaurantRow.registryCourt,
        shareCapital: restaurantRow.shareCapital?.toString() ?? null,
        shareCapitalCurrency: restaurantRow.shareCapitalCurrency,
        registeredAddress: restaurantRow.registeredAddress as Record<string, unknown> | null,
        registeredAddressSameAsTrading: restaurantRow.registeredAddressSameAsTrading,
        supportEmail: restaurantRow.supportEmail,
        supportPhone: restaurantRow.supportPhone,
        complaintsEmail: restaurantRow.complaintsEmail,
        privacyEmail: restaurantRow.privacyEmail,
        defaultDeliveryFee: restaurantRow.defaultDeliveryFee.toString(),
        minOrderAmount: restaurantRow.minOrderAmount.toString(),
        estimatedDeliveryMinutesMin: restaurantRow.estimatedDeliveryMinutesMin,
        estimatedDeliveryMinutesMax: restaurantRow.estimatedDeliveryMinutesMax,
        estimatedPickupMinutesMin: restaurantRow.estimatedPickupMinutesMin,
        estimatedPickupMinutesMax: restaurantRow.estimatedPickupMinutesMax,
      },
    });
    const legalSnapshotHash = hashLegalSnapshot(legalSnapshot);

    // Atomically claim the idempotency key right before we create the order.
    // A second concurrent request with the same key sees `done` (replay) or
    // `pending` (reject) instead of racing into a duplicate order.
    const reservation = await this.idempotency.reserve(scope, idempotencyKey);
    if (reservation.status === 'done') {
      return this.getById(actor, reservation.orderId);
    }
    if (reservation.status === 'pending') {
      throw new ConflictException('A request with this Idempotency-Key is already being processed');
    }

    let created!: Order;
    try {
      const orderNumber = await this.orderNumber.next();

      created = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: actor.userId,
            // Remember the source cart so confirmation can clear it server-side
            // (the single guarantee that a confirmed order empties the basket for
            // every payment type + guests). See confirmPendingOrder.
            cartId: cart.id,
            type: dto.type,
            status: 'PENDING',
            subtotal,
            taxTotal,
            deliveryFee,
            tipAmount,
            discountTotal,
            grandTotal,
            currency: restaurantRow.currency,
            deliveryAddress: deliveryAddress ?? Prisma.JsonNull,
            pickupAt: dto.pickupAt ? new Date(dto.pickupAt) : null,
            notes: dto.notes ?? null,
            // Immutable customer contact snapshot (plan §C1) — required for guest
            // receipts/notifications and independent of later profile edits.
            customerName: dto.contact?.name ?? null,
            customerEmail: dto.contact?.email ?? null,
            customerPhone: dto.contact?.phone ?? null,
            checkoutLocale: dto.checkoutLocale,
            // Server-generated legal-acceptance evidence (plan §C2). The deprecated
            // acceptedTermsAt is kept in sync until a later migration drops it.
            acceptedTermsAt: legalAcceptedAt,
            legalAcceptedAt,
            legalBundleVersion: dto.legalBundleVersion,
            legalSnapshot: legalSnapshot as unknown as Prisma.InputJsonValue,
            legalSnapshotHash,
            couponCode,
            items: {
              create: lineSnapshots.map((l) => ({
                menuItemId: l.menuItemId,
                nameSnapshot: l.nameSnapshot,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
                modifierSnapshot: l.modifierSnapshot as unknown as Prisma.InputJsonValue,
                notes: l.notes,
              })),
            },
            statusEvents: {
              create: {
                status: 'PENDING',
                byUserId: actor.userId,
                note: 'Order placed',
              },
            },
          },
        });

        if (couponRedemption) {
          await tx.couponRedemption.create({
            data: {
              promotionId: couponRedemption.promotionId,
              userId: actor.userId,
              orderId: order.id,
            },
          });
        }

        // Burn redeemed loyalty points inside the same tx. Throws (rolls the
        // order back) if the balance changed since the quote.
        if (actor.userId && loyaltyPointsToBurn > 0) {
          await this.loyalty.burnForOrderTx(tx, actor.userId, order.id, loyaltyPointsToBurn);
        }

        // Clear the cart at creation ONLY for COD (finalized synchronously below).
        // Online orders stay PENDING until eService confirms — keep the basket so a
        // declined/abandoned payment doesn't lose it. The web confirmation page
        // clears the cart once it sees the order confirmed.
        if (dto.paymentMethod === 'COD') {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.update({
            where: { id: cart.id },
            data: { appliedPromotionId: null, loyaltyPointsToRedeem: 0 },
          });
        }

        return order;
      });

      await this.idempotency.store(scope, idempotencyKey, created.id);
    } catch (err) {
      // Failed attempt — release the reservation so the client can retry.
      await this.idempotency.release(scope, idempotencyKey);
      throw err;
    }

    // Cash on delivery: finalize synchronously at order creation. This is the
    // only path that works for guests (POST /orders is public, but
    // POST /payments/intent requires an authed owner). We record a COD Payment
    // row and confirm the order, mirroring PaymentsService.createIntent's COD
    // branch exactly (provider 'cod', status 'PAID', then confirmPendingOrder).
    // Online methods (card/BLIK) are left PENDING for the eService redirect flow.
    //
    // Done BEFORE emitting `order.created` so the realtime event (and the admin
    // live orders list, which patches its cache from this event) carries the
    // true post-confirm status. Otherwise a COD order shows as PENDING on the
    // board while its freshly-fetched detail reads CONFIRMED — the table/popup
    // inconsistency. `confirmPendingOrder` stays deliberately silent on
    // `order.status_changed` (no customer SMS / e2e shape change); we surface
    // the confirm purely through the created event's status field here.
    let realtimeStatus: OrderDto['status'] = created.status;
    if (dto.paymentMethod === 'COD') {
      await this.prisma.payment.create({
        data: {
          orderId: created.id,
          provider: 'cod',
          providerRef: `cod_${created.id}`,
          method: 'COD',
          amount: created.grandTotal,
          currency: created.currency,
          status: 'PAID',
        },
      });
      const confirmed = await this.confirmPendingOrder(created.id, 'Payment confirmed');
      if (confirmed) realtimeStatus = 'CONFIRMED';
    }

    // Emit an internal event so the realtime/notification dispatcher can react.
    // Prefer the order's contact snapshot (populated for guests too).
    const customerName = created.customerName ?? (await this.loadCustomerName(created.userId));
    const createdEvent: OrderCreatedEvent = {
      orderId: created.id,
      orderNumber: created.orderNumber,
      userId: created.userId,
      status: realtimeStatus,
      type: created.type,
      grandTotal: created.grandTotal.toFixed(2),
      currency: created.currency,
      itemCount: lineSnapshots.length,
      customerName,
      createdAt: created.createdAt.toISOString(),
    };
    this.events.emit('order.created', createdEvent);

    if (actor.userId && loyaltyPointsToBurn > 0) {
      this.analytics.capture('loyalty_redeemed', {
        userId: actor.userId,
        orderId: created.id,
        points: loyaltyPointsToBurn,
        discount: loyaltyDiscount.toFixed(2),
      });
    }

    // Just-created order — bypass the ownership check so guests (no userId)
    // can read the response. The frontend only ever sees the order id from
    // this path; subsequent reads still go through the standard ownership
    // gate (or signed-token tracking for guests).
    const responseDto = await this.getById(actor, created.id, { bypassOwnership: true });
    // Issue a signed tracking token so guests can refresh the confirmation
    // page (or share the link) without an auth header. Authed users can
    // ignore it — their session already proves ownership.
    responseDto.trackingToken = signOrderTrackingToken(created.id);
    return responseDto;
  }

  /**
   * Confirm a still-PENDING order once its payment is settled. Shared by the
   * COD-at-checkout path (above) and PaymentsService (eService webhook / COD
   * intent) so both behave identically.
   *
   * Idempotent + state-safe: the conditional update only matches a still
   * PENDING order, so concurrent duplicate webhook deliveries (or a racing
   * cancel) can't double-confirm, resurrect a terminal order, or enqueue a
   * second receipt. Deliberately does NOT run the realtime state machine
   * (no `order.status_changed` / kitchen events) — it mirrors the original
   * payment-confirm behaviour and the e2e suite asserts this shape.
   *
   * @returns true if this call performed the confirm, false if the order was
   *   no longer PENDING (already confirmed/cancelled).
   */
  async confirmPendingOrder(orderId: string, note: string): Promise<boolean> {
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
    if (count === 0) {
      this.logger.log(`Order ${orderId} not PENDING — skipping confirm`);
      return false;
    }
    await this.prisma.orderStatusEvent.create({
      data: { orderId, status: 'CONFIRMED', note },
    });
    await this.receiptQueue.add(JOB_RECEIPT_GENERATE, { orderId });
    // Empty the basket the moment the order is confirmed — the server-side
    // guarantee for EVERY payment type and EVERY user. COD already cleared at
    // creation (this is then a no-op); online (card/BLIK) clears here when
    // eService settles via the return handler / webhook / reconcile — which is
    // the only reliable point for guests, who get no realtime and whose success
    // page can load before settle-on-return finishes. Best-effort: a clear
    // failure must never un-confirm the order (the client success page + the next
    // reconcile pass are backstops).
    try {
      await this.clearOrderCart(orderId);
    } catch (err) {
      this.logger.warn(`Order ${orderId} cart-clear skipped: ${(err as Error).message}`);
    }
    this.logger.log(`Order ${orderId} confirmed`);
    return true;
  }

  /**
   * Delete the items of the cart an order was created from and reset its applied
   * promo/loyalty (mirrors the COD-at-creation clear). No-op when the order has
   * no linked cart or the cart was already emptied/deleted (guest login-merge),
   * so it is safe to call on every confirm.
   */
  private async clearOrderCart(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { cartId: true },
    });
    if (!order?.cartId) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: order.cartId } });
    await this.prisma.cart.updateMany({
      where: { id: order.cartId },
      data: { appliedPromotionId: null, loyaltyPointsToRedeem: 0 },
    });
  }

  // Public read by signed HMAC token — used by /checkout/success on refresh
  // and by any shareable link. The token itself proves ownership, so no
  // actor is required.
  async getByVerifiedToken(orderId: string): Promise<OrderDto> {
    const dto = await this.getById(
      { userId: null, sessionKey: null, permissions: [] },
      orderId,
      { bypassOwnership: true },
    );
    return dto;
  }

  // ---- Status transitions ------------------------------------------------

  async transition(
    actor: OrderActor & { roles: string[] },
    orderId: string,
    to: OrderDto['status'],
    note: string | null,
    reason: string | null,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const actorRole = actorRoleFor(actor.roles);
    const result = canTransition({
      from: order.status,
      to,
      actor: actorRole,
      orderType: order.type,
      reason: reason ?? null,
    });
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    // Customer-side: only the owner may move PENDING → CANCELLED.
    if (actorRole === 'customer' && order.userId !== actor.userId) {
      throw new ForbiddenException('Not your order');
    }

    // A paid ONLINE order can't be plain-cancelled — its money must be returned
    // via the refund flow (which transitions it to REFUNDED). COD is recorded as
    // PAID at creation but takes cash on hand-over, so it (and any unpaid order)
    // cancels freely. Gate on method, never status (COD looks PAID).
    if (to === 'CANCELLED') {
      const payment = await this.prisma.payment.findUnique({ where: { orderId } });
      if (
        payment &&
        payment.method !== 'COD' &&
        (payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED')
      ) {
        throw new BadRequestException(
          'This order was paid online — issue a refund instead of cancelling.',
        );
      }
    }

    const next = await this.applyTransition(orderId, order.status, to, actor.userId, note);
    return this.toDtoById(next.id);
  }

  /**
   * Apply a transition without re-running the state machine. Internal —
   * called by trusted callers (payments service via webhook, refund flow).
   */
  async forceTransition(
    orderId: string,
    to: OrderDto['status'],
    byUserId: string | null,
    note: string | null,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const result = canTransition({
      from: order.status,
      to,
      actor: 'system',
      orderType: order.type,
    });
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    await this.applyTransition(orderId, order.status, to, byUserId, note);
  }

  private async applyTransition(
    orderId: string,
    from: OrderDto['status'],
    to: OrderDto['status'],
    byUserId: string | null,
    note: string | null,
  ): Promise<Order> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: to },
      }),
      this.prisma.orderStatusEvent.create({
        data: { orderId, status: to, byUserId, note },
      }),
    ]);

    // `from` is the caller's pre-update status (both callers loaded the order
    // and ran the state machine on it). Deriving it from the event log here
    // was racy — concurrent transitions / equal createdAt could swap rows.
    const previousStatus = from;

    const [itemCount, fallbackName] = await Promise.all([
      this.prisma.orderItem.count({ where: { orderId } }),
      this.loadCustomerName(updated.userId),
    ]);
    // Prefer the order's contact snapshot (populated for guests too).
    const customerName = updated.customerName ?? fallbackName;

    const statusEvent: OrderStatusChangedEvent = {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      userId: updated.userId,
      from: previousStatus,
      to,
      type: updated.type,
      grandTotal: updated.grandTotal.toFixed(2),
      currency: updated.currency,
      itemCount,
      customerName,
      note,
      changedAt: new Date().toISOString(),
    };

    this.events.emit('order.status_changed', statusEvent);
    if (to === 'CANCELLED') this.events.emit('order.cancelled', statusEvent);
    if (to === 'PREPARING') this.events.emit('kitchen.ticket_added', statusEvent);
    // Pull the ticket off the KDS on any exit from the active set — including
    // terminal/abandon states, otherwise refunded/cancelled/delivered orders
    // leave ghost tickets on the board.
    if (
      to === 'READY' ||
      to === 'OUT_FOR_DELIVERY' ||
      to === 'COMPLETED' ||
      to === 'DELIVERED' ||
      to === 'CANCELLED' ||
      to === 'REFUNDED'
    ) {
      this.events.emit('kitchen.ticket_removed', statusEvent);
    }

    // Delivery hand-off done → schedule the auto-archive to COMPLETED after the
    // grace window. Staff's last action is "Delivered"; the system closes it out.
    // Deterministic jobId so it never double-schedules; best-effort (a scheduling
    // failure must not fail the delivery transition itself).
    if (to === 'DELIVERED') {
      this.ordersQueue
        .add(
          JOB_ORDER_AUTO_COMPLETE,
          { orderId },
          {
            delay: AUTO_COMPLETE_GRACE_MS,
            jobId: `order-autocomplete:${orderId}`,
            removeOnComplete: true,
            removeOnFail: 100,
          },
        )
        .catch((err) =>
          this.logger.error(`failed to schedule auto-complete for order ${orderId}: ${err}`),
        );
    }
    return updated;
  }

  /**
   * Auto-archive a delivered order to COMPLETED once its grace window elapses.
   * Called by the order-auto-complete worker. Idempotent + safe on a stale or
   * duplicate job: re-reads the order and no-ops unless it is still DELIVERED (a
   * refund or manual change may have moved it on). Fires as the `system` actor,
   * and swallows a lost race so the worker never retry-storms.
   */
  async autoCompleteDelivered(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) {
      this.logger.warn(`autoCompleteDelivered: order ${orderId} not found — skipping`);
      return;
    }
    if (order.status !== 'DELIVERED') {
      // Already completed / refunded / otherwise moved on — nothing to do.
      return;
    }
    try {
      await this.forceTransition(orderId, 'COMPLETED', null, 'Auto-completed after delivery');
    } catch (err) {
      // Lost a race (status changed between the read above and the transition).
      // Benign — log and return cleanly so BullMQ doesn't treat it as a failure.
      this.logger.warn(`autoCompleteDelivered: could not complete ${orderId} — ${err}`);
    }
  }

  /**
   * Add a staff note to an order without transitioning status. Writes an
   * `OrderStatusEvent` with `kind: NOTE` so it appears in the same activity
   * timeline as status events, ordered by `createdAt`.
   */
  async addNote(
    actor: { userId: string | null; permissions: string[] },
    orderId: string,
    note: string,
  ): Promise<OrderDto> {
    if (!actor.permissions.includes('order:update')) {
      throw new ForbiddenException('Not allowed to annotate orders');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.orderStatusEvent.create({
      data: {
        orderId,
        kind: 'NOTE',
        status: order.status,
        byUserId: actor.userId,
        note,
      },
    });
    return this.toDtoById(orderId);
  }

  /**
   * Staff-set per-order ETA: total prep/delivery minutes measured from order
   * placement (or `null` to clear and fall back to the status-based estimate).
   * Records a NOTE event for the activity timeline / audit trail.
   */
  async setEta(
    actor: { userId: string | null; permissions: string[] },
    orderId: string,
    prepMinutesOverride: number | null,
  ): Promise<OrderDto> {
    if (!actor.permissions.includes('order:status_update')) {
      throw new ForbiddenException('Not allowed to set order ETA');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { prepMinutesOverride },
    });
    await this.prisma.orderStatusEvent.create({
      data: {
        orderId,
        kind: 'NOTE',
        status: order.status,
        byUserId: actor.userId,
        note:
          prepMinutesOverride != null
            ? `Estimated time set to ${prepMinutesOverride} min`
            : 'Estimated time cleared',
      },
    });
    return this.toDtoById(orderId);
  }

  private async loadCustomerName(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!user) return null;
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return full || user.email;
  }

  // ---- Read --------------------------------------------------------------

  /**
   * Dual-mode list:
   * - Staff (caller has `order:read`) → admin list with server-side filtering
   *   (status, type, date range, search).
   * - Everyone else → the caller's own orders (account history), unchanged.
   */
  async list(actor: OrderActor, query: OrderListQuery): Promise<OrderListDto> {
    const isStaff = actor.permissions.includes('order:read');

    let where: Prisma.OrderWhereInput;
    if (isStaff) {
      where = this.buildAdminListWhere({
        status: query.status,
        type: query.type,
        from: query.from,
        to: query.to,
        search: query.search,
      });
    } else {
      if (!actor.userId) {
        throw new ForbiddenException('Sign in to view your orders');
      }
      where = {
        userId: actor.userId,
        ...(query.status ? { status: query.status } : {}),
      };
    }

    const limit = query.limit ?? 20;
    const rows = await this.prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((r) => toListItem(r)),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Admin-mode where-builder. Shared between `list` (when called with staff
   * permissions) and `exportList`. Customer-self-view uses a different where
   * shape (userId scoping) and stays inline in `list`.
   */
  private buildAdminListWhere(input: {
    status?: OrderListQuery['status'];
    type?: OrderListQuery['type'];
    from?: string;
    to?: string;
    search?: string;
  }): Prisma.OrderWhereInput {
    return {
      ...(input.status ? { status: input.status } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: new Date(input.from) } : {}),
              ...(input.to ? { lte: new Date(input.to) } : {}),
            },
          }
        : {}),
      ...(buildSearchWhere(
        ORDER_SEARCH_DESCRIPTORS,
        input.search,
      ) as Prisma.OrderWhereInput),
    };
  }

  /**
   * CSV / PDF export of the admin orders list — same filter surface as
   * `list`, no pagination. Caller must hold `order:read` (enforced at the
   * controller). Caps at 50k rows for CSV / 1k for PDF; over the cap throws
   * 413 with a structured hint.
   */
  async exportList(
    query: OrderExportQuery,
  ): Promise<{ filename: string; content: Buffer; contentType: string }> {
    const where = this.buildAdminListWhere({
      status: query.status,
      type: query.type,
      from: query.from,
      to: query.to,
      search: query.search,
    });

    const count = await this.prisma.order.count({ where });
    assertWithinRowCap(count, query.format, 'orders');

    const rows = await this.prisma.order.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportRows: OrderExportRow[] = rows.map((r) => ({
      orderNumber: r.orderNumber,
      type: r.type,
      status: r.status,
      grandTotal: r.grandTotal,
      currency: r.currency,
      itemCount: r._count.items,
      // Prefer the order's contact snapshot (present for guests too).
      customerName:
        r.customerName ??
        (r.user ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || null : null),
      customerEmail: r.customerEmail ?? r.user?.email ?? null,
      createdAt: r.createdAt,
    }));

    const slug = await this.restaurantSlug();
    const filename = exportFilename('orders', slug, query.format);

    if (query.format === 'pdf') {
      const content = await buildPdf(exportRows, ORDER_EXPORT_COLUMNS, {
        title: `Orders — ${slug}`,
        generatedAt: `Generated ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      });
      return { filename, content, contentType: PDF_CONTENT_TYPE };
    }
    const content = buildCsv(exportRows, ORDER_EXPORT_COLUMNS);
    return { filename, content, contentType: CSV_CONTENT_TYPE };
  }

  private async restaurantSlug(): Promise<string> {
    const r = await this.prisma.restaurant.findFirst({ select: { slug: true } });
    if (!r) throw new NotFoundException('Restaurant not configured');
    return r.slug;
  }

  async getById(
    actor: OrderActor,
    id: string,
    opts: { bypassOwnership?: boolean } = {},
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = actor.userId !== null && order.userId === actor.userId;
    const canReadAny = actor.permissions.includes('order:read');
    if (!opts.bypassOwnership && !isOwner && !canReadAny) {
      throw new NotFoundException('Order not found');
    }

    const dto = toOrderDto(order);
    if (canReadAny) {
      const [customer, payment] = await Promise.all([
        this.loadOrderCustomer(order),
        this.loadOrderPayment(order.id),
      ]);
      dto.customer = customer;
      dto.payment = payment;
    }
    return dto;
  }

  async getTracking(actor: OrderActor, id: string): Promise<OrderTrackingDto> {
    return this.buildTracking(id, { skipAuth: false, actor });
  }

  /**
   * Public, token-authenticated tracking — used for confirmation-email deep
   * links. Caller has already verified an HMAC token bound to this orderId, so
   * no user/permission check is performed here.
   */
  async getTrackingByVerifiedToken(orderId: string): Promise<OrderTrackingDto> {
    return this.buildTracking(orderId, { skipAuth: true });
  }

  private async buildTracking(
    id: string,
    opts: { skipAuth: true } | { skipAuth: false; actor: OrderActor },
  ): Promise<OrderTrackingDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const restaurant = await this.prisma.restaurant.findFirst({ select: { geoPoint: true } });

    if (!opts.skipAuth) {
      const isOwner = opts.actor.userId !== null && order.userId === opts.actor.userId;
      const canReadAny = opts.actor.permissions.includes('order:read');
      if (!isOwner && !canReadAny) {
        throw new NotFoundException('Order not found');
      }
    }

    const lastEvent = order.statusEvents[order.statusEvents.length - 1];
    const anchorAt = lastEvent?.createdAt ?? order.createdAt;
    const { etaMinutes, estimatedReadyAt } = computeEta({
      type: order.type,
      status: order.status,
      anchorAt,
      createdAt: order.createdAt,
      prepMinutesOverride: order.prepMinutesOverride,
      now: new Date(),
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      isTerminal: isTerminalStatus(order.status),
      timeline: order.statusEvents.map((e) => ({
        id: e.id,
        orderId: e.orderId,
        kind: e.kind,
        status: e.status,
        byUserId: e.byUserId,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
      etaMinutes,
      estimatedReadyAt,
      restaurantGeo: parseGeoPoint(restaurant?.geoPoint ?? null),
      deliveryGeo: parseGeoPoint(
        (order.deliveryAddress as { geoPoint?: unknown } | null)?.geoPoint,
      ),
    };
  }

  private async loadOrderCustomer(order: {
    userId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
  }): Promise<OrderCustomerDto | null> {
    // Prefer the immutable contact snapshot captured at checkout — this is the
    // only source that works for guest orders and is stable against later
    // profile edits (plan §C1).
    if (order.customerEmail) {
      return {
        id: order.userId,
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      };
    }
    // Legacy orders (placed before the snapshot existed): fall back to the live
    // user row.
    if (!order.userId) return null;
    const u = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    if (!u) return null;
    return {
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null,
      email: u.email,
      phone: u.phone,
    };
  }

  private async loadOrderPayment(orderId: string): Promise<OrderPaymentDto | null> {
    const p = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { refunds: { orderBy: { createdAt: 'asc' } } },
    });
    if (!p) return null;
    return {
      id: p.id,
      orderId: p.orderId,
      provider: p.provider,
      providerRef: p.providerRef,
      method: p.method as PaymentMethodKind,
      amount: p.amount.toFixed(2),
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      refunds: p.refunds.map((r) => ({
        id: r.id,
        paymentId: r.paymentId,
        amount: r.amount.toFixed(2),
        reason: r.reason,
        providerRef: r.providerRef,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /** Internal: load + map by id without ownership scoping. */
  private async toDtoById(id: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        items: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    return toOrderDto(order);
  }

  /** Public read helper for the kitchen module — no per-order ownership check. */
  async listKitchenTickets(): Promise<
    {
      orderId: string;
      orderNumber: string;
      type: OrderDto['type'];
      status: OrderDto['status'];
      confirmedAt: string | null;
      specialRequests: string | null;
      items: {
        name: string;
        quantity: number;
        modifiers: string[];
        notes: string | null;
      }[];
    }[]
  > {
    const rows = await this.prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PREPARING'] },
      },
      include: {
        items: true,
        statusEvents: {
          where: { status: 'CONFIRMED' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return (
      rows
        .map((r) => ({
          orderId: r.id,
          orderNumber: r.orderNumber,
          type: r.type,
          status: r.status,
          confirmedAt: r.statusEvents[0]?.createdAt.toISOString() ?? null,
          specialRequests: r.notes,
          items: r.items.map((it) => {
            const snapshot = it.modifierSnapshot as unknown as ModifierSnapshotEntry[] | null;
            return {
              name: it.nameSnapshot,
              quantity: it.quantity,
              modifiers: snapshot ? snapshot.map((s) => `${s.groupName}: ${s.optionName}`) : [],
              notes: it.notes,
            };
          }),
        }))
        // KDS contract: oldest-confirmed first. confirmedAt is an ISO string so
        // lexicographic compare is chronological; rows without a CONFIRMED event
        // (shouldn't happen for CONFIRMED|PREPARING) sort last.
        .sort((a, b) => (a.confirmedAt ?? '~').localeCompare(b.confirmedAt ?? '~'))
    );
  }
}

// ---- Mappers ---------------------------------------------------------------

type OrderWithRelations = Order & {
  items: OrderItem[];
  statusEvents: OrderStatusEvent[];
};

type OrderListRow = Order & {
  items: { id: string }[];
  user: { firstName: string | null; lastName: string | null; email: string } | null;
};

function parseGeoPoint(value: unknown): GeoPointDto | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { lat?: unknown; lng?: unknown };
  if (typeof v.lat === 'number' && typeof v.lng === 'number') {
    return { lat: v.lat, lng: v.lng };
  }
  return null;
}

function toListItem(r: OrderListRow): OrderListItemDto {
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    status: r.status,
    type: r.type,
    grandTotal: r.grandTotal.toFixed(2),
    currency: r.currency,
    itemCount: r.items.length,
    // Prefer the order's contact snapshot (present for guests too).
    customerName:
      r.customerName ??
      (r.user
        ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ').trim() || r.user.email
        : null),
    createdAt: r.createdAt.toISOString(),
  };
}

function toOrderDto(row: OrderWithRelations): OrderDto {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    userId: row.userId,
    type: row.type,
    status: row.status,
    subtotal: row.subtotal.toFixed(2),
    taxTotal: row.taxTotal.toFixed(2),
    deliveryFee: row.deliveryFee.toFixed(2),
    tipAmount: row.tipAmount.toFixed(2),
    discountTotal: row.discountTotal.toFixed(2),
    grandTotal: row.grandTotal.toFixed(2),
    loyaltyPointsUsed: row.loyaltyPointsUsed,
    loyaltyPointsEarned: row.loyaltyPointsEarned,
    currency: row.currency,
    deliveryAddress: row.deliveryAddress as OrderDto['deliveryAddress'],
    pickupAt: row.pickupAt?.toISOString() ?? null,
    notes: row.notes,
    couponCode: row.couponCode,
    prepMinutesOverride: row.prepMinutesOverride,
    items: row.items.map((it) => ({
      id: it.id,
      menuItemId: it.menuItemId,
      nameSnapshot: it.nameSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toFixed(2),
      lineTotal: it.lineTotal.toFixed(2),
      modifierSnapshot: it.modifierSnapshot as unknown as ModifierSnapshotEntry[],
      notes: it.notes,
    })),
    statusEvents: row.statusEvents.map((e) => ({
      id: e.id,
      orderId: e.orderId,
      kind: e.kind,
      status: e.status,
      byUserId: e.byUserId,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
