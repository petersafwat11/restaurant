import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@repo/db';
import type { Order, OrderItem, OrderStatusEvent } from '@repo/db';
import type {
  CreateOrderDto,
  DeliveryZoneDto,
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
  PaymentMethodKind,
} from '@repo/types';
import { Decimal, addAll, decimalToString, multiply, toDecimal } from '@repo/utils/money';
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
import { DeliveryZoneService } from '../settings/delivery-zone.service';
import { IdempotencyService } from './idempotency.service';
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

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly orderNumber: OrderNumberService,
    private readonly idempotency: IdempotencyService,
    private readonly pricing: PricingService,
    private readonly loyalty: LoyaltyService,
    private readonly analytics: AnalyticsProductService,
    private readonly events: EventEmitter2,
    private readonly deliveryZones: DeliveryZoneService,
  ) {}

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

    const restaurantRow = await this.prisma.restaurant.findFirst({
      select: {
        id: true,
        currency: true,
        deliveryZones: true,
        minOrderAmount: true,
        defaultDeliveryFee: true,
      },
    });
    if (!restaurantRow) throw new BadRequestException('Restaurant not configured');

    // Load the caller's cart (server-side authoritative).
    const cart = await this.prisma.cart.findFirst({
      where: actor.userId
        ? { userId: actor.userId }
        : { sessionKey: dto.sessionKey ?? actor.sessionKey ?? '' },
      include: {
        items: true,
        appliedCoupon: true,
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const restaurant = { currency: restaurantRow.currency };

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
    let couponRedemption: { couponId: string } | null = null;
    if (cart.appliedCoupon) {
      const result = await this.promotions.validate({
        code: cart.appliedCoupon.code,
        subtotal: decimalToString(subtotalPreview),
        userId: actor.userId ?? undefined,
      });
      if (!result.valid) {
        throw new BadRequestException(`Coupon: ${result.message}`);
      }
      couponDiscount = toDecimal(result.discountAmount);
      couponCode = cart.appliedCoupon.code;
      couponRedemption = { couponId: cart.appliedCoupon.id };
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
        tipAmount: dto.tipAmount ?? '0',
        // Flat restaurant-wide fee — only charged for DELIVERY orders.
        deliveryFee:
          dto.type === 'DELIVERY' ? restaurantRow.defaultDeliveryFee.toString() : 0,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

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

      // 2. Re-validate the pin against the restaurant's delivery zones. The
      //    client also checks, but we never trust client values.
      const zones = (restaurantRow.deliveryZones as unknown as DeliveryZoneDto[]) ?? [];
      if (zones.length > 0) {
        const zone = this.deliveryZones.findZone(
          zones,
          snapshot.geoPoint.lat,
          snapshot.geoPoint.lng,
        );
        if (!zone) {
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
            type: dto.type,
            status: 'PENDING',
            subtotal,
            taxTotal,
            deliveryFee,
            tipAmount,
            discountTotal,
            grandTotal,
            currency: restaurant.currency,
            deliveryAddress: deliveryAddress ?? Prisma.JsonNull,
            pickupAt: dto.pickupAt ? new Date(dto.pickupAt) : null,
            notes: dto.notes ?? null,
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
              couponId: couponRedemption.couponId,
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

        // Clear the cart so the user doesn't re-submit the same items.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { appliedCouponId: null, loyaltyPointsToRedeem: 0 },
        });

        return order;
      });

      await this.idempotency.store(scope, idempotencyKey, created.id);
    } catch (err) {
      // Failed attempt — release the reservation so the client can retry.
      await this.idempotency.release(scope, idempotencyKey);
      throw err;
    }

    // Emit an internal event so the realtime/notification dispatcher can react.
    const customerName = await this.loadCustomerName(created.userId);
    const createdEvent: OrderCreatedEvent = {
      orderId: created.id,
      orderNumber: created.orderNumber,
      userId: created.userId,
      status: created.status,
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

    const [itemCount, customerName] = await Promise.all([
      this.prisma.orderItem.count({ where: { orderId } }),
      this.loadCustomerName(updated.userId),
    ]);

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
    return updated;
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
      customerName: r.user
        ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || null
        : null,
      customerEmail: r.user?.email ?? null,
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
        this.loadOrderCustomer(order.userId),
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

  private async loadOrderCustomer(userId: string | null): Promise<OrderCustomerDto | null> {
    if (!userId) return null;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
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
    customerName: r.user
      ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ').trim() || r.user.email
      : null,
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
