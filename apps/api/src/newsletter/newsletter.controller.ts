import { Body, Controller, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type NewsletterSubscribeDto,
  NewsletterSubscribeSchema,
  type NewsletterTokenDto,
  NewsletterTokenSchema,
} from '@repo/types';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NewsletterService } from './newsletter.service';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(202)
  subscribe(
    @Ip() ip: string,
    @Body(new ZodValidationPipe(NewsletterSubscribeSchema)) dto: NewsletterSubscribeDto,
  ) {
    return this.newsletter.subscribe(dto, ip || null);
  }

  @Public()
  @Post('confirm')
  @HttpCode(200)
  confirm(@Body(new ZodValidationPipe(NewsletterTokenSchema)) dto: NewsletterTokenDto) {
    return this.newsletter.confirm(dto.token);
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(200)
  unsubscribe(@Body(new ZodValidationPipe(NewsletterTokenSchema)) dto: NewsletterTokenDto) {
    return this.newsletter.unsubscribe(dto.token);
  }
}
