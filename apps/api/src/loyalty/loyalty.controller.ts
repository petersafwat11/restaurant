import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type LoyaltyHistoryQuery,
  LoyaltyHistoryQuerySchema,
  type LoyaltyRedeemQuoteRequest,
  LoyaltyRedeemQuoteRequestSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  getAccount(@CurrentUser() user: RequestUser) {
    return this.loyalty.getAccount(user.id);
  }

  @Get('me/history')
  getHistory(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(LoyaltyHistoryQuerySchema)) q: LoyaltyHistoryQuery,
  ) {
    return this.loyalty.getHistory(user.id, q);
  }

  @Post('redeem/quote')
  redeemQuote(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(LoyaltyRedeemQuoteRequestSchema))
    dto: LoyaltyRedeemQuoteRequest,
  ) {
    return this.loyalty.quoteRedemption(user.id, dto.points, dto.subtotal);
  }
}
