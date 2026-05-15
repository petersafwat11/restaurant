import { Injectable } from '@nestjs/common';
import type {
  LoyaltyAccountDto,
  LoyaltyHistoryDto,
  LoyaltyHistoryQuery,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint 9: read-only loyalty surface for the account screen. Earn/redeem is
 * Sprint 11 — this only exposes the balance + ledger and lazily creates a
 * zero/`bronze` account so the screen always has something to render.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccount(userId: string): Promise<LoyaltyAccountDto> {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      id: account.id,
      userId: account.userId,
      points: account.points,
      tier: account.tier,
    };
  }

  async getHistory(
    userId: string,
    query: LoyaltyHistoryQuery,
  ): Promise<LoyaltyHistoryDto> {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
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
        reason: t.reason,
        orderId: t.orderId,
        createdAt: t.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }
}
