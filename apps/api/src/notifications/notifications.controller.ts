import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type NotificationListQuery,
  NotificationListQuerySchema,
  type RegisterPushTokenDto,
  RegisterPushTokenSchema,
  type UpdateNotificationPreferenceDto,
  UpdateNotificationPreferenceSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
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

  @Post('push-tokens')
  @HttpCode(200)
  registerPushToken(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(RegisterPushTokenSchema)) dto: RegisterPushTokenDto,
  ) {
    return this.notifications.registerPushToken(user.id, dto);
  }

  @Delete('push-tokens/:token')
  @HttpCode(200)
  unregisterPushToken(@CurrentUser() user: RequestUser, @Param('token') token: string) {
    return this.notifications.unregisterPushToken(user.id, token);
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
