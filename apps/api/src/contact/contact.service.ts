import { InjectQueue } from '@nestjs/bullmq';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { JOB_EMAIL_CONTACT, QUEUE_EMAIL } from '@repo/jobs';
import type {
  ContactMessageDto,
  ContactMessageListDto,
  ContactMessageListQuery,
  ContactStatus,
  CreateContactMessageDto,
  UpdateContactMessageDto,
} from '@repo/types';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 10 * 60;

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  async create(dto: CreateContactMessageDto, ip: string | null): Promise<ContactMessageDto> {
    await this.assertNotThrottled(ip);

    const message = await this.prisma.contactMessage.create({
      data: {
        restaurantId: dto.restaurantId ?? null,
        name: dto.name,
        email: dto.email,
        subject: dto.subject ?? null,
        message: dto.message,
      },
    });

    const restaurant = dto.restaurantId
      ? await this.prisma.restaurant.findUnique({
          where: { id: dto.restaurantId },
          select: { email: true },
        })
      : await this.prisma.restaurant.findFirst({
          where: { isActive: true },
          select: { email: true },
        });

    if (restaurant?.email) {
      await this.emailQueue.add(JOB_EMAIL_CONTACT, {
        contactMessageId: message.id,
        name: dto.name,
        email: dto.email,
        subject: dto.subject ?? null,
        message: dto.message,
        restaurantEmail: restaurant.email,
      });
    }

    return toDto(message);
  }

  async list(query: ContactMessageListQuery): Promise<ContactMessageListDto> {
    const limit = query.limit ?? 20;
    const where: Prisma.ContactMessageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
    };
    const rows = await this.prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

  async updateStatus(
    id: string,
    dto: UpdateContactMessageDto,
    actorUserId: string,
  ): Promise<ContactMessageDto> {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Message not found');
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: {
        status: dto.status,
        handledByUserId: actorUserId,
        handledAt: new Date(),
      },
    });
    return toDto(updated);
  }

  private async assertNotThrottled(ip: string | null): Promise<void> {
    if (!ip) return;
    const key = `contact:rl:${ip}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, RATE_WINDOW_SECONDS);
    }
    if (count > RATE_LIMIT) {
      throw new HttpException(
        'Too many messages, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

function toDto(row: {
  id: string;
  restaurantId: string | null;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  handledByUserId: string | null;
  handledAt: Date | null;
  createdAt: Date;
}): ContactMessageDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status as ContactStatus,
    handledByUserId: row.handledByUserId,
    handledAt: row.handledAt ? row.handledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
