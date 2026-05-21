import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Public()
  @Get('landing')
  landing() {
    return this.marketing.landing();
  }

  @Public()
  @Get('about')
  about() {
    return this.marketing.about();
  }
}
