import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AdminSetUserPasswordDto,
  AdminSetUserPasswordSchema,
  type ChangePasswordDto,
  ChangePasswordSchema,
  type UpdateProfileDto,
  UpdateProfileSchema,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('me/change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(ChangePasswordSchema)) dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user.id, dto);
    return { success: true as const };
  }

  /**
   * Owner-only force-set of another user's password (staff or customer).
   * Permission is re-verified against the actor's roles in the service.
   */
  @Post(':id/password')
  @HttpCode(200)
  @Permissions('user:set_password')
  @AuditAction('user:set_password', 'user', { idFrom: 'id' })
  async adminSetPassword(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminSetUserPasswordSchema)) dto: AdminSetUserPasswordDto,
  ) {
    await this.users.adminSetPassword({ userId: user.id, roleKeys: user.roles }, id, dto);
    return { success: true as const };
  }
}
