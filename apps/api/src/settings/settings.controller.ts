import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HolidaySchema, UpdateRestaurantSettingsSchema } from '@repo/types';
import type { HolidayDto, UpdateRestaurantSettingsDto } from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('admin/restaurant')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Permissions('settings:read')
  @Get('settings')
  get() {
    return this.settings.get();
  }

  @Permissions('settings:write')
  @Patch('settings')
  @AuditAction('settings:write', 'settings')
  update(
    @Body(new ZodValidationPipe(UpdateRestaurantSettingsSchema)) dto: UpdateRestaurantSettingsDto,
  ) {
    return this.settings.update(dto);
  }

  @Permissions('settings:write')
  @Post('holidays')
  @AuditAction('settings:write', 'settings')
  addHoliday(
    @Body(new ZodValidationPipe(HolidaySchema)) holiday: HolidayDto,
  ) {
    return this.settings.addHoliday(holiday);
  }

  @Permissions('settings:write')
  @Delete('holidays/:date')
  @AuditAction('settings:write', 'settings')
  removeHoliday(@Param('date') date: string) {
    return this.settings.removeHoliday(date);
  }
}
