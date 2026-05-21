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
  type BulkGenerateCouponsDto,
  BulkGenerateCouponsSchema,
  type CreateCouponDto,
  CreateCouponSchema,
  type CreatePromotionDto,
  CreatePromotionSchema,
  type UpdatePromotionDto,
  UpdatePromotionSchema,
  type ValidateCouponDto,
  ValidateCouponSchema,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
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
  list(
    @Query('active') active?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.promotions.list(active === 'true', includeArchived === 'true');
  }

  @Post('promotions/:id/archive')
  @HttpCode(200)
  @Permissions('promotion:archive')
  @AuditAction('promotion:write', 'promotion')
  archive(@Param('id') id: string) {
    return this.promotions.archive(id);
  }

  @Post('promotions/:id/unarchive')
  @HttpCode(200)
  @Permissions('promotion:archive')
  @AuditAction('promotion:write', 'promotion')
  unarchive(@Param('id') id: string) {
    return this.promotions.unarchive(id);
  }

  @Get('promotions/:id')
  @Permissions('promotion:read')
  getById(@Param('id') id: string) {
    return this.promotions.getById(id);
  }

  @Post('promotions')
  @Permissions('promotion:write')
  @AuditAction('promotion:write', 'promotion')
  create(
    @Body(new ZodValidationPipe(CreatePromotionSchema)) dto: CreatePromotionDto,
  ) {
    return this.promotions.create(dto);
  }

  @Patch('promotions/:id')
  @Permissions('promotion:write')
  @AuditAction('promotion:write', 'promotion')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePromotionSchema)) dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, dto);
  }

  @Delete('promotions/:id')
  @HttpCode(200)
  @Permissions('promotion:write')
  @AuditAction('promotion:delete', 'promotion')
  async remove(@Param('id') id: string) {
    const removed = await this.promotions.remove(id);
    return { success: true as const, ...removed };
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

  @Post('promotions/:id/coupons/bulk')
  @Permissions('promotion:write')
  bulkGenerateCoupons(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(BulkGenerateCouponsSchema)) dto: BulkGenerateCouponsDto,
  ) {
    return this.promotions.bulkGenerateCoupons(id, dto);
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
