import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@repo/db';
import type {
  LoyaltyAccountDto,
  LoyaltyHistoryDto,
  LoyaltyHistoryQuery,
  LoyaltyRedeemQuoteDto,
  LoyaltyTxnKind,
  OrderStatusChangedEvent,
} from '@repo/types';
import { Decimal, type DecimalLike, toDecimal } from '@repo/utils/money';
import {
  discountForPoints,
  maxRedeemablePoints,
  nextTier,
  pointsForAmount,
  tierForLifetime,
} from '@repo/utils/loyalty';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint 11: loyalty earn/redeem. Points are earned on order
 * completion/delivery and redeemed at checkout as a server-computed
 * discount (never client-trusted). Every ledger write is idempotent via the
 * `LoyaltyTransaction(accountId, orderId, kind)` unique index, so duplicate
 * events / retries cannot double-credit or double-burn.
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAccount(userId: string): Promise<LoyaltyAccountDto> {
    const account = await this.ensureAccount(userId);
    return this.toAccountDto(account);
  }

  async getHistory(userId: string, query: LoyaltyHistoryQuery): Promise<LoyaltyHistoryDto> {
    const account = await this.ensureAccount(userId);
    const limit = query.limit ?? 20;
    const rows = await this.prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((t) => ({
        id: t.id,
        delta: t.delta,
        kind: t.kind as LoyaltyTxnKind,
        reason: t.reason,
        orderId: t.orderId,
        createdAt: t.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  /** Server-computed redemption quote — the client sends points, never money. */
  async quoteRedemption(
    userId: string,
    points: number,
    subtotal: DecimalLike,
  ): Promise<LoyaltyRedeemQuoteDto> {
    const account = await this.ensureAccount(userId);
    const max = maxRedeemablePoints(account.points, subtotal);
    const appliable = Math.max(0, Math.min(Math.floor(points), max));
    const discount = discountForPoints(appliable);
    return {
      requestedPoints: Math.max(0, Math.floor(points)),
      appliablePoints: appliable,
      maxRedeemablePoints: max,
      discountAmount: discount.toFixed(2),
      balanceAfter: account.points - appliable,
    };
  }

  /**
   * Burn exactly `points` for an order inside the order-creation
   * transaction and persist `Order.loyaltyPointsUsed`. The discount was
   * already locked into pricing by `quoteRedemption`, so the burn must be
   * exact: a conditional decrement that affects 0 rows means the balance
   * changed under us → throw so the whole order rolls back and the client
   * retries with a fresh quote. This keeps grandTotal == burned-points.
   */
  async burnForOrderTx(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    points: number,
  ): Promise<Decimal> {
    const burn = Math.max(0, Math.floor(points));
    if (burn === 0) return new Decimal(0);

    const account = await this.ensureAccount(userId, tx);
    const updated = await tx.loyaltyAccount.updateMany({
      where: { id: account.id, points: { gte: burn } },
      data: { points: { decrement: burn } },
    });
    if (updated.count === 0) {
      throw new ConflictException('Loyalty balance changed — please review your order and retry');
    }

    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        orderId,
        kind: 'REDEEM',
        delta: -burn,
        reason: `Redeemed ${burn} points on order`,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { loyaltyPointsUsed: burn },
    });
    return discountForPoints(burn);
  }

  /** Earn points when an order completes/delivers. Idempotent per order. */
  @OnEvent('order.status_changed')
  async onOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    if (!event.userId) return;
    if (event.to === 'COMPLETED' || event.to === 'DELIVERED') {
      await this.earnForOrder(event.orderId).catch((err) =>
        this.logger.error(`earnForOrder ${event.orderId} failed: ${err}`),
      );
    }
    if (event.to === 'CANCELLED' || event.to === 'REFUNDED') {
      await this.reverseForOrder(event.orderId).catch((err) =>
        this.logger.error(`reverseForOrder ${event.orderId} failed: ${err}`),
      );
    }
  }

  async earnForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        grandTotal: true,
        tipAmount: true,
        loyaltyPointsEarned: true,
      },
    });
    if (!order?.userId) return;

    const eligible = toDecimal(order.grandTotal).minus(toDecimal(order.tipAmount));
    const points = pointsForAmount(eligible);
    if (points <= 0) return;

    const account = await this.ensureAccount(order.userId);
    await this.prisma
      .$transaction(async (tx) => {
        await tx.loyaltyTransaction.create({
          data: {
            accountId: account.id,
            orderId,
            kind: 'EARN',
            delta: points,
            reason: 'Points earned on order',
          },
        });
        const acct = await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: {
            points: { increment: points },
            lifetimePoints: { increment: points },
          },
        });
        await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: { tier: tierForLifetime(acct.lifetimePoints) },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { loyaltyPointsEarned: points },
        });
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return; // already earned for this order — idempotent no-op
        }
        throw err;
      });
  }

  /** Revoke earned points + refund redeemed points on cancel/refund. */
  async reverseForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        loyaltyPointsEarned: true,
        loyaltyPointsUsed: true,
      },
    });
    if (!order?.userId) return;
    const account = await this.ensureAccount(order.userId);

    if (order.loyaltyPointsEarned > 0) {
      await this.writeReversal(
        account.id,
        orderId,
        'REVOKE',
        -order.loyaltyPointsEarned,
        'Earned points revoked (order cancelled/refunded)',
        { lifetime: -order.loyaltyPointsEarned },
      );
    }
    if (order.loyaltyPointsUsed > 0) {
      await this.writeReversal(
        account.id,
        orderId,
        'REDEEM_REVERSAL',
        order.loyaltyPointsUsed,
        'Redeemed points refunded (order cancelled/refunded)',
      );
    }
  }

  /** Grant referral points (called by ReferralsService). orderId stays null
   * so the per-order unique index does not block multiple referral rewards. */
  async grantPoints(
    userId: string,
    points: number,
    reason: string,
    kind: LoyaltyTxnKind = 'REFERRAL',
  ): Promise<void> {
    if (points <= 0) return;
    const account = await this.ensureAccount(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: { accountId: account.id, orderId: null, kind, delta: points, reason },
      });
      const acct = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: points },
          lifetimePoints: { increment: points },
        },
      });
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { tier: tierForLifetime(acct.lifetimePoints) },
      });
    });
  }

  // ---- internals ---------------------------------------------------------

  private async writeReversal(
    accountId: string,
    orderId: string,
    kind: LoyaltyTxnKind,
    delta: number,
    reason: string,
    opts: { lifetime?: number } = {},
  ): Promise<void> {
    await this.prisma
      .$transaction(async (tx) => {
        await tx.loyaltyTransaction.create({
          data: { accountId, orderId, kind, delta, reason },
        });
        const acct = await tx.loyaltyAccount.findUniqueOrThrow({
          where: { id: accountId },
        });
        const points = Math.max(0, acct.points + delta);
        const lifetime = Math.max(0, acct.lifetimePoints + (opts.lifetime ?? 0));
        await tx.loyaltyAccount.update({
          where: { id: accountId },
          data: { points, lifetimePoints: lifetime, tier: tierForLifetime(lifetime) },
        });
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return; // already reversed — idempotent
        }
        throw err;
      });
  }

  private async ensureAccount(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.loyaltyAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private toAccountDto(account: {
    id: string;
    userId: string;
    points: number;
    lifetimePoints: number;
  }): LoyaltyAccountDto {
    const tier = tierForLifetime(account.lifetimePoints);
    const next = nextTier(account.lifetimePoints);
    return {
      id: account.id,
      userId: account.userId,
      points: account.points,
      lifetimePoints: account.lifetimePoints,
      tier,
      nextTier: next.tier,
      pointsToNextTier: next.pointsToNext,
    };
  }
}
