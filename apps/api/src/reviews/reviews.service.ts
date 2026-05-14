import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  CreateReviewDto,
  ReviewDto,
  ReviewListDto,
  ReviewListQuery,
  ReviewModerationDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  userId: string | null;
  permissions: string[];
}

const URL_REGEX = /https?:\/\//gi;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: Actor, dto: CreateReviewDto): Promise<ReviewDto> {
    if (!actor.userId) throw new ForbiddenException('Sign in to review');

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== actor.userId) throw new ForbiddenException('Not your order');
    if (order.review) throw new BadRequestException('Already reviewed');
    if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
      throw new BadRequestException('Only completed orders can be reviewed');
    }

    const urls = (dto.comment ?? '').match(URL_REGEX);
    const isVisible = !urls || urls.length < 2;

    const created = await this.prisma.review.create({
      data: {
        orderId: order.id,
        userId: actor.userId,
        rating: dto.rating,
        comment: dto.comment ?? null,
        isVisible,
      },
    });
    return toDto(created);
  }

  async listForRestaurant(
    restaurantId: string,
    query: ReviewListQuery,
  ): Promise<ReviewListDto> {
    const limit = query.limit ?? 20;
    const where: Prisma.ReviewWhereInput = {
      isVisible: true,
      order: { restaurantId },
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sort === 'rating' ? { rating: 'desc' } : { createdAt: 'desc' };

    const rows = await this.prisma.review.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: { user: { select: { firstName: true } } },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((r) => ({
        ...toDto(r),
        authorName: r.user?.firstName ?? null,
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  async listMine(actor: Actor): Promise<ReviewListDto> {
    if (!actor.userId) throw new ForbiddenException('Sign in');
    const rows = await this.prisma.review.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items: rows.map(toDto), nextCursor: null };
  }

  async listAdmin(query: ReviewListQuery): Promise<ReviewListDto> {
    const limit = query.limit ?? 50;
    const where: Prisma.ReviewWhereInput = {
      ...(query.restaurantId ? { order: { restaurantId: query.restaurantId } } : {}),
      ...(query.isVisible !== undefined ? { isVisible: query.isVisible } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const rows = await this.prisma.review.findMany({
      where,
      orderBy: query.sort === 'rating' ? { rating: 'desc' } : { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map(toDto),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  async setVisibility(id: string, dto: ReviewModerationDto): Promise<ReviewDto> {
    const updated = await this.prisma.review.update({
      where: { id },
      data: { isVisible: dto.isVisible },
    });
    return toDto(updated);
  }
}

function toDto(row: {
  id: string;
  orderId: string;
  userId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: Date;
}): ReviewDto {
  return {
    id: row.id,
    orderId: row.orderId,
    userId: row.userId,
    rating: row.rating,
    comment: row.comment,
    isVisible: row.isVisible,
    createdAt: row.createdAt.toISOString(),
  };
}
