import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type SeoMetaQuery, SeoMetaQuerySchema } from '@repo/types';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get('structured-data/:slug')
  structuredData(@Param('slug') slug: string) {
    return this.seo.structuredData(slug);
  }

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  sitemap() {
    return this.seo.sitemap();
  }

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() {
    return this.seo.robots();
  }

  @Public()
  @Get('meta')
  meta(@Query(new ZodValidationPipe(SeoMetaQuerySchema)) q: SeoMetaQuery) {
    return this.seo.meta(q);
  }
}
