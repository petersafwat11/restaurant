import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  DeliveryZoneCheckQuerySchema,
  HolidaySchema,
  UpdateRestaurantSettingsSchema,
} from '@repo/types';
import type {
  DeliveryZoneCheckQuery,
  HolidayDto,
  UpdateRestaurantSettingsDto,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
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

  @Public()
  @Get('delivery-zones/check')
  checkZone(
    @Query(new ZodValidationPipe(DeliveryZoneCheckQuerySchema)) q: DeliveryZoneCheckQuery,
  ) {
    return this.settings.checkDeliveryZone(q.lat, q.lng);
  }

  /**
   * Public list of delivery-zone polygons — used by the customer map picker
   * to render the coverage area. Excludes restaurant-wide config (fee, min
   * order, tax) which live on the settings root and aren't needed here.
   */
  @Public()
  @Get('delivery-zones')
  async listZones() {
    const zones = await this.settings.getPublicDeliveryZones();
    return { zones };
  }
}
