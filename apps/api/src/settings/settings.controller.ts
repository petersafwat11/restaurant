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
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('admin/restaurants/:id')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Permissions('settings:read')
  @Get('settings')
  get(@Param('id') id: string) {
    return this.settings.get(id);
  }

  @Permissions('settings:write')
  @Patch('settings')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRestaurantSettingsSchema)) dto: UpdateRestaurantSettingsDto,
  ) {
    return this.settings.update(id, dto);
  }

  @Permissions('settings:write')
  @Post('holidays')
  addHoliday(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(HolidaySchema)) holiday: HolidayDto,
  ) {
    return this.settings.addHoliday(id, holiday);
  }

  @Permissions('settings:write')
  @Delete('holidays/:date')
  removeHoliday(@Param('id') id: string, @Param('date') date: string) {
    return this.settings.removeHoliday(id, date);
  }

  @Public()
  @Get('delivery-zones/check')
  checkZone(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(DeliveryZoneCheckQuerySchema)) q: DeliveryZoneCheckQuery,
  ) {
    return this.settings.checkDeliveryZone(id, q.lat, q.lng);
  }
}
