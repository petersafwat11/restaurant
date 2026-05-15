import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type MarketingQuery, MarketingQuerySchema } from '@repo/types';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Public()
  @Get('landing')
  landing(@Query(new ZodValidationPipe(MarketingQuerySchema)) q: MarketingQuery) {
    return this.marketing.landing(q.restaurantId);
  }

  @Public()
  @Get('about')
  about(@Query(new ZodValidationPipe(MarketingQuerySchema)) q: MarketingQuery) {
    return this.marketing.about(q.restaurantId);
  }
}
