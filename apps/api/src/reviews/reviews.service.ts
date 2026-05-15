import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import {
  type CreateReviewDto,
  MAX_REVIEW_IMAGES,
  type ReviewDto,
  type ReviewListDto,
  type ReviewListQuery,
  type ReviewModerationDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

interface Actor {
  userId: string | null;
  permissions: string[];
}

const URL_REGEX = /https?:\/\//gi;

const REVIEW_INCLUDE = {
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

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

    const imageKeys = (dto.imageKeys ?? []).slice(0, MAX_REVIEW_IMAGES);

    const created = await this.prisma.review.create({
      data: {
        orderId: order.id,
        userId: actor.userId,
        rating: dto.rating,
        comment: dto.comment ?? null,
        isVisible,
        images: {
          create: imageKeys.map((key, position) => ({
            url: this.uploads.publicUrlForKey(key),
            position,
          })),
        },
      },
      include: REVIEW_INCLUDE,
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
      include: { ...REVIEW_INCLUDE, user: { select: { firstName: true } } },
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
      include: REVIEW_INCLUDE,
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
      include: REVIEW_INCLUDE,
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
      include: REVIEW_INCLUDE,
    });
    return toDto(updated);
  }
}

function toDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    orderId: row.orderId,
    userId: row.userId,
    rating: row.rating,
    comment: row.comment,
    isVisible: row.isVisible,
    createdAt: row.createdAt.toISOString(),
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      position: img.position,
    })),
  };
}
