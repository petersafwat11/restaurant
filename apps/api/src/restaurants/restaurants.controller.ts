import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type UpdateOperatingHoursDto,
  UpdateOperatingHoursSchema,
  type UpdateRestaurantDto,
  UpdateRestaurantSchema,
} from '@repo/types';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurant')
@Controller('restaurant')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Public()
  @Get()
  get() {
    return this.restaurants.get();
  }

  @Public()
  @Get('hours')
  getHours() {
    return this.restaurants.getHours();
  }

  @Permissions('restaurant:read')
  @Get('admin')
  getAdmin() {
    return this.restaurants.getAdmin();
  }

  @Patch()
  @Permissions('restaurant:write')
  update(@Body(new ZodValidationPipe(UpdateRestaurantSchema)) dto: UpdateRestaurantDto) {
    return this.restaurants.update(dto);
  }

  @Put('hours')
  @Permissions('restaurant:write')
  updateHours(
    @Body(new ZodValidationPipe(UpdateOperatingHoursSchema)) dto: UpdateOperatingHoursDto,
  ) {
    return this.restaurants.updateHours(dto);
  }
}
