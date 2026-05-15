import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  getDir,
  getMessageCatalog,
  isLocale,
  negotiateLocale,
} from '@repo/i18n';
import {
  type I18nMessagesDto,
  type I18nMessagesQuery,
  I18nMessagesQuerySchema,
} from '@repo/types';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  @Public()
  @Get('messages')
  messages(
    @Query(new ZodValidationPipe(I18nMessagesQuerySchema)) q: I18nMessagesQuery,
    @Headers('accept-language') acceptLanguage?: string,
  ): I18nMessagesDto {
    const locale =
      q.locale && isLocale(q.locale)
        ? q.locale
        : negotiateLocale(acceptLanguage);
    return {
      locale,
      dir: getDir(locale),
      messages: getMessageCatalog(locale),
    };
  }
}
