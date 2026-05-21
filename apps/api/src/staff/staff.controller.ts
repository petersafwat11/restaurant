import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AcceptStaffInviteSchema,
  InviteStaffSchema,
  StaffListQuerySchema,
  UpdateStaffRoleSchema,
} from '@repo/types';
import type {
  AcceptStaffInviteDto,
  InviteStaffDto,
  StaffListQuery,
  UpdateStaffRoleDto,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StaffService } from './staff.service';

@ApiTags('staff')
@Controller()
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Permissions('staff:read')
  @Get('admin/staff')
  list(@Query(new ZodValidationPipe(StaffListQuerySchema)) q: StaffListQuery) {
    return this.staff.list(q);
  }

  @Permissions('staff:write')
  @Post('admin/staff/invite')
  @AuditAction('staff:invite', 'staff')
  invite(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(InviteStaffSchema)) dto: InviteStaffDto,
  ) {
    return this.staff.invite({ userId: user.id, roleKeys: user.roles }, dto);
  }

  @Public()
  @Post('staff/accept-invite')
  acceptInvite(@Body(new ZodValidationPipe(AcceptStaffInviteSchema)) dto: AcceptStaffInviteDto) {
    return this.staff.acceptInvite(dto);
  }

  @Permissions('staff:write')
  @Patch('admin/staff/:userId/role')
  @AuditAction('staff:role_change', 'staff', { idFrom: 'userId' })
  updateRole(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateStaffRoleSchema)) dto: UpdateStaffRoleDto,
  ) {
    return this.staff.updateRole({ userId: user.id, roleKeys: user.roles }, userId, dto);
  }

  @Permissions('staff:write')
  @Post('admin/staff/:userId/deactivate')
  @AuditAction('staff:deactivate', 'staff', { idFrom: 'userId' })
  deactivate(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.staff.deactivate({ userId: user.id, roleKeys: user.roles }, userId);
  }

  @Permissions('staff:write')
  @Post('admin/staff/:userId/reactivate')
  @AuditAction('staff:reactivate', 'staff', { idFrom: 'userId' })
  reactivate(@Param('userId') userId: string) {
    return this.staff.reactivate(userId);
  }
}
