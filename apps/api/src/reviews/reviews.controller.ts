import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateReviewSchema,
  ReviewListQuerySchema,
  ReviewModerationSchema,
} from '@repo/types';
import type {
  CreateReviewDto,
  ReviewListQuery,
  ReviewModerationDto,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('reviews')
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
  ) {
    return this.reviews.create({ userId: user.id, permissions: user.permissions }, dto);
  }

  @Get('reviews/me')
  listMine(@CurrentUser() user: RequestUser) {
    return this.reviews.listMine({ userId: user.id, permissions: user.permissions });
  }

  @Public()
  @Get('restaurants/:id/reviews')
  listForRestaurant(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(ReviewListQuerySchema)) q: ReviewListQuery,
  ) {
    return this.reviews.listForRestaurant(id, q);
  }

  @Permissions('review:moderate')
  @Get('admin/reviews')
  listAdmin(@Query(new ZodValidationPipe(ReviewListQuerySchema)) q: ReviewListQuery) {
    return this.reviews.listAdmin(q);
  }

  @Permissions('review:moderate')
  @Patch('admin/reviews/:id')
  moderate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewModerationSchema)) dto: ReviewModerationDto,
  ) {
    return this.reviews.setVisibility(id, dto);
  }

  @Permissions('review:moderate')
  @Delete('admin/reviews/:id')
  hide(@Param('id') id: string) {
    return this.reviews.setVisibility(id, { isVisible: false });
  }
}
