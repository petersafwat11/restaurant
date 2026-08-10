import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type NotificationListQuery,
  NotificationListQuerySchema,
  type UpdateNotificationPreferenceDto,
  UpdateNotificationPreferenceSchema,
  type WebPushSubscriptionInputDto,
  WebPushSubscriptionInputSchema,
  type WebPushUnsubscribeDto,
  WebPushUnsubscribeSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(NotificationListQuerySchema)) q: NotificationListQuery,
  ) {
    return this.notifications.list(user.id, q);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: RequestUser) {
    return { unreadCount: await this.notifications.unreadCount(user.id) };
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post('web-push')
  @Permissions('order:read')
  @HttpCode(200)
  subscribeWebPush(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(WebPushSubscriptionInputSchema))
    dto: WebPushSubscriptionInputDto,
  ) {
    return this.notifications.subscribeWebPush(user.id, dto);
  }

  @Post('web-push/unsubscribe')
  @Permissions('order:read')
  @HttpCode(200)
  unsubscribeWebPush(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(WebPushUnsubscribeSchema)) dto: WebPushUnsubscribeDto,
  ) {
    return this.notifications.unsubscribeWebPush(user.id, dto.endpoint);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.notifications.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(UpdateNotificationPreferenceSchema))
    dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notifications.updatePreferences(user.id, dto);
  }
}
