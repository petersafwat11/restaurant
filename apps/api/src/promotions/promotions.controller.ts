import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CreateCouponDto,
  CreateCouponSchema,
  type CreatePromotionDto,
  CreatePromotionSchema,
  type UpdatePromotionDto,
  UpdatePromotionSchema,
  type ValidateCouponDto,
  ValidateCouponSchema,
} from '@repo/types';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@Controller()
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get('promotions')
  @Permissions('promotion:read')
  list(@Query('active') active?: string) {
    return this.promotions.list(active === 'true');
  }

  @Get('promotions/:id')
  @Permissions('promotion:read')
  getById(@Param('id') id: string) {
    return this.promotions.getById(id);
  }

  @Post('promotions')
  @Permissions('promotion:write')
  create(
    @Body(new ZodValidationPipe(CreatePromotionSchema)) dto: CreatePromotionDto,
  ) {
    return this.promotions.create(dto);
  }

  @Patch('promotions/:id')
  @Permissions('promotion:write')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePromotionSchema)) dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, dto);
  }

  @Delete('promotions/:id')
  @HttpCode(200)
  @Permissions('promotion:write')
  async remove(@Param('id') id: string) {
    await this.promotions.remove(id);
    return { success: true as const };
  }

  @Get('promotions/:id/coupons')
  @Permissions('promotion:read')
  listCoupons(@Param('id') id: string) {
    return this.promotions.listCoupons(id);
  }

  @Post('promotions/:id/coupons')
  @Permissions('promotion:write')
  createCoupon(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCouponSchema)) dto: CreateCouponDto,
  ) {
    return this.promotions.createCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @HttpCode(200)
  @Permissions('promotion:write')
  async removeCoupon(@Param('id') id: string) {
    await this.promotions.removeCoupon(id);
    return { success: true as const };
  }

  // Public so the cart-side `applyCoupon` flow can validate before binding
  // the coupon to the cart, and so guest carts can preview the discount.
  @Public()
  @Post('coupons/validate')
  @HttpCode(200)
  validate(
    @Body(new ZodValidationPipe(ValidateCouponSchema)) dto: ValidateCouponDto,
  ) {
    return this.promotions.validate(dto);
  }
}
