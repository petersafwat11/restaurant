import { randomInt } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@repo/db';
import { JOB_PUSH_LOYALTY, QUEUE_PUSH } from '@repo/jobs';
import type {
  OrderStatusChangedEvent,
  ReferralListDto,
  ReferralListQuery,
  ReferralMeDto,
} from '@repo/types';
import { REFERRAL_REFEREE_POINTS, REFERRAL_REFERRER_POINTS } from '@repo/utils/loyalty';
import type { Queue } from 'bullmq';
import { AnalyticsProductService } from '../analytics-product/analytics-product.service';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PrismaService } from '../prisma/prisma.service';

// Unambiguous alphabet — no I/L/O/U/0/1.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LEN = 8;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    @Inject(ENV) private readonly env: ENV_TYPE,
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue,
    private readonly analytics: AnalyticsProductService,
  ) {}

  async getOrCreateCode(userId: string): Promise<string> {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) return existing.code;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.randomCode();
      try {
        const created = await this.prisma.referralCode.create({
          data: { userId, code },
        });
        return created.code;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // userId already has a code (race) or code collision — retry/return.
          const row = await this.prisma.referralCode.findUnique({
            where: { userId },
          });
          if (row) return row.code;
          continue;
        }
        throw err;
      }
    }
    throw new Error('Could not allocate a unique referral code');
  }

  async getMe(userId: string): Promise<ReferralMeDto> {
    const code = await this.getOrCreateCode(userId);
    const [totalReferred, totalCompleted, earned] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'COMPLETED' },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        _sum: { delta: true },
        where: {
          kind: 'REFERRAL',
          account: { userId },
        },
      }),
    ]);
    return {
      code,
      link: `${this.baseUrl}/register?ref=${code}`,
      totalReferred,
      totalCompleted,
      pointsEarned: earned._sum.delta ?? 0,
    };
  }

  async listMine(
    userId: string,
    query: ReferralListQuery,
  ): Promise<ReferralListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { referee: { select: { firstName: true, email: true } } },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((r) => ({
        id: r.id,
        refereeName: r.referee?.firstName ?? r.referee?.email ?? null,
        status: r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        rewardGranted: r.rewardGranted,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Attach a pending referral when a new user signs up with a code. Never
   * throws into the signup path — a bad code just means "no referral".
   */
  async attachReferralOnSignup(
    refereeId: string,
    rawCode: string | undefined,
  ): Promise<void> {
    if (!rawCode) return;
    const code = rawCode.toUpperCase();
    try {
      const referralCode = await this.prisma.referralCode.findUnique({
        where: { code },
      });
      if (!referralCode) return;
      if (referralCode.userId === refereeId) return; // self-referral
      const already = await this.prisma.referral.findUnique({
        where: { refereeId },
      });
      if (already) return; // a user can only be referred once
      await this.prisma.referral.create({
        data: {
          codeId: referralCode.id,
          referrerId: referralCode.userId,
          refereeId,
          status: 'PENDING',
        },
      });
    } catch (err) {
      this.logger.warn(`attachReferralOnSignup failed: ${err}`);
    }
  }

  /** Complete a referral on the referee's first finished order. Idempotent. */
  @OnEvent('order.status_changed')
  async onOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    if (!event.userId) return;
    if (event.to !== 'COMPLETED' && event.to !== 'DELIVERED') return;

    const referral = await this.prisma.referral.findUnique({
      where: { refereeId: event.userId },
    });
    if (!referral || referral.rewardGranted) return;

    // Claim the reward atomically: only the updater that flips
    // rewardGranted false→true proceeds to grant points.
    const claimed = await this.prisma.referral.updateMany({
      where: { id: referral.id, rewardGranted: false },
      data: {
        status: 'COMPLETED',
        rewardGranted: true,
        completedAt: new Date(),
      },
    });
    if (claimed.count === 0) return;

    try {
      await this.loyalty.grantPoints(
        referral.referrerId,
        REFERRAL_REFERRER_POINTS,
        'Referral reward (friend completed first order)',
      );
      await this.loyalty.grantPoints(
        referral.refereeId,
        REFERRAL_REFEREE_POINTS,
        'Welcome referral bonus',
      );
      // Side-effect push (never awaited into the event path failure).
      await this.pushQueue.add(JOB_PUSH_LOYALTY, {
        userId: referral.referrerId,
        points: REFERRAL_REFERRER_POINTS,
        reason: 'REFERRAL',
      });
      await this.pushQueue.add(JOB_PUSH_LOYALTY, {
        userId: referral.refereeId,
        points: REFERRAL_REFEREE_POINTS,
        reason: 'REFERRAL',
      });
      this.analytics.capture('referral_completed', {
        referrerId: referral.referrerId,
        refereeId: referral.refereeId,
      });
    } catch (err) {
      this.logger.error(`Referral reward grant failed: ${err}`);
    }
  }

  private get baseUrl(): string {
    return this.env.APP_URL_WEB.replace(/\/+$/, '');
  }

  private randomCode(): string {
    let out = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += ALPHABET[randomInt(ALPHABET.length)];
    }
    return out;
  }
}
