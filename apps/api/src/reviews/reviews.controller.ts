import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateReviewSchema,
  OwnerReplySchema,
  ReviewListQuerySchema,
  ReviewModerationSchema,
} from '@repo/types';
import type {
  CreateReviewDto,
  OwnerReplyDto,
  ReviewListQuery,
  ReviewModerationDto,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
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
  @Get('reviews')
  list(@Query(new ZodValidationPipe(ReviewListQuerySchema)) q: ReviewListQuery) {
    return this.reviews.list(q);
  }

  @Public()
  @Get('reviews/summary')
  summary() {
    return this.reviews.getSummary();
  }

  @Permissions('review:moderate')
  @Get('admin/reviews')
  listAdmin(@Query(new ZodValidationPipe(ReviewListQuerySchema)) q: ReviewListQuery) {
    return this.reviews.listAdmin(q);
  }

  @Permissions('review:moderate')
  @Patch('admin/reviews/:id')
  @AuditAction('review:moderate', 'review')
  moderate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewModerationSchema)) dto: ReviewModerationDto,
  ) {
    return this.reviews.setVisibility(id, dto);
  }

  @Permissions('review:moderate')
  @Post('admin/reviews/:id/reply')
  @AuditAction('review:moderate', 'review')
  reply(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OwnerReplySchema)) dto: OwnerReplyDto,
  ) {
    return this.reviews.reply(id, dto.reply);
  }

  @Permissions('review:moderate')
  @Delete('admin/reviews/:id')
  @AuditAction('review:moderate', 'review')
  hide(@Param('id') id: string) {
    return this.reviews.setVisibility(id, { isVisible: false });
  }
}
