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
  GeoPointDto,
  ModifierSnapshotEntry,
  OrderCreatedEvent,
  OrderCustomerDto,
  OrderDto,
  OrderListDto,
  OrderListItemDto,
  OrderListQuery,
  OrderPaymentDto,
  OrderStatusChangedEvent,
  OrderTrackingDto,
  PaymentMethodKind,
} from '@repo/types';
import { Decimal, addAll, decimalToString, multiply, toDecimal } from '@repo/utils';
import { AnalyticsProductService } from '../analytics-product/analytics-product.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { IdempotencyService } from './idempotency.service';
import { OrderNumberService } from './order-number';
import { type ActorRole, actorRoleFor, canTransition } from './order-state-machine';
import { computeEta, isTerminalStatus } from './order-tracking';

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

    // Load the caller's cart (server-side authoritative).
    const cart = await this.prisma.cart.findFirst({
      where: actor.userId
        ? { userId: actor.userId, restaurantId: dto.restaurantId }
        : { sessionKey: dto.sessionKey ?? actor.sessionKey ?? '', restaurantId: dto.restaurantId },
      include: {
        items: true,
        appliedCoupon: true,
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: dto.restaurantId },
      select: { currency: true },
    });

    // Re-validate each line against the live menu.
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: cart.items.map((it) => it.menuItemId) } },
      include: { category: { select: { restaurantId: true } } },
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
      if (menuItem.category.restaurantId !== dto.restaurantId) {
        throw new BadRequestException(`Item ${menuItem.name} does not belong to this restaurant`);
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
        restaurantId: dto.restaurantId,
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
        restaurantId: dto.restaurantId,
        lines: lineSnapshots.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
        couponDiscount: couponDiscount.plus(loyaltyDiscount),
        tipAmount: dto.tipAmount ?? '0',
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const { subtotal, taxTotal, deliveryFee, tipAmount, discountTotal, grandTotal } = totals;

    let deliveryAddress: Prisma.InputJsonValue | null = null;
    if (dto.type === 'DELIVERY' && dto.deliveryAddressId) {
      if (!actor.userId) {
        throw new BadRequestException('Delivery orders require a signed-in user');
      }
      const addr = await this.prisma.userAddress.findFirst({
        where: { id: dto.deliveryAddressId, userId: actor.userId },
      });
      if (!addr) throw new NotFoundException('Delivery address not found');
      deliveryAddress = {
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
      };
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
            restaurantId: dto.restaurantId,
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
      restaurantId: created.restaurantId,
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

    return this.getById(actor, created.id);
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
      restaurantId: updated.restaurantId,
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
   * - Staff (caller has `order:read`) supplying `restaurantId` → restaurant-wide
   *   admin list with server-side filtering (status, type, date range, search).
   * - Everyone else → the caller's own orders (account history), unchanged.
   */
  async list(actor: OrderActor, query: OrderListQuery): Promise<OrderListDto> {
    const isStaff = actor.permissions.includes('order:read');

    let where: Prisma.OrderWhereInput;
    if (isStaff && query.restaurantId) {
      where = {
        restaurantId: query.restaurantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { orderNumber: { contains: query.search, mode: 'insensitive' } },
                { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
                { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
                { user: { email: { contains: query.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      };
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

  async getById(actor: OrderActor, id: string): Promise<OrderDto> {
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
    if (!isOwner && !canReadAny) {
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
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        statusEvents: { orderBy: { createdAt: 'asc' } },
        restaurant: { select: { geoPoint: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = actor.userId !== null && order.userId === actor.userId;
    const canReadAny = actor.permissions.includes('order:read');
    if (!isOwner && !canReadAny) {
      throw new NotFoundException('Order not found');
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
        status: e.status,
        byUserId: e.byUserId,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
      etaMinutes,
      estimatedReadyAt,
      restaurantGeo: parseGeoPoint(order.restaurant.geoPoint),
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
  async listKitchenTickets(restaurantId: string): Promise<
    {
      orderId: string;
      orderNumber: string;
      status: OrderDto['status'];
      confirmedAt: string | null;
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
        restaurantId,
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
          status: r.status,
          confirmedAt: r.statusEvents[0]?.createdAt.toISOString() ?? null,
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
    restaurantId: r.restaurantId,
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
    restaurantId: row.restaurantId,
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
      status: e.status,
      byUserId: e.byUserId,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
