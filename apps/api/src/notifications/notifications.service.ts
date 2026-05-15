import { Injectable } from '@nestjs/common';
import type {
  NotificationDto,
  NotificationListDto,
  NotificationListQuery,
  NotificationPreferenceDto,
  RegisterPushTokenDto,
  UpdateNotificationPreferenceDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PREFERENCE: NotificationPreferenceDto = {
  orderUpdatesPush: true,
  orderUpdatesEmail: true,
  orderUpdatesSms: true,
  promotionsPush: false,
  promotionsEmail: false,
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: NotificationListQuery): Promise<NotificationListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return {
      items: slice.map(toDto),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
      unreadCount,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<{ success: true }> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ success: true; count: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, count: res.count };
  }

  // ---- Push tokens ------------------------------------------------------

  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<{ success: true }> {
    // Idempotent: the token is globally unique. If it was registered to a
    // different user (shared device, account switch) re-point it.
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform,
        lastUsedAt: new Date(),
      },
      update: { userId, platform: dto.platform, lastUsedAt: new Date() },
    });
    return { success: true };
  }

  async unregisterPushToken(userId: string, token: string): Promise<{ success: true }> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
    return { success: true };
  }

  // ---- Preferences ------------------------------------------------------

  async getPreferences(userId: string): Promise<NotificationPreferenceDto> {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!row) return { ...DEFAULT_PREFERENCE };
    return {
      orderUpdatesPush: row.orderUpdatesPush,
      orderUpdatesEmail: row.orderUpdatesEmail,
      orderUpdatesSms: row.orderUpdatesSms,
      promotionsPush: row.promotionsPush,
      promotionsEmail: row.promotionsEmail,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...DEFAULT_PREFERENCE, ...dto },
      update: { ...dto },
    });
    return {
      orderUpdatesPush: row.orderUpdatesPush,
      orderUpdatesEmail: row.orderUpdatesEmail,
      orderUpdatesSms: row.orderUpdatesSms,
      promotionsPush: row.promotionsPush,
      promotionsEmail: row.promotionsEmail,
    };
  }
}

function toDto(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data ?? null) as unknown,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
