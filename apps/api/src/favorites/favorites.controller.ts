import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type FavoriteListQuery,
  FavoriteListQuerySchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(FavoriteListQuerySchema)) q: FavoriteListQuery,
  ) {
    return this.favorites.list(user.id, q);
  }

  @Get('ids')
  ids(@CurrentUser() user: RequestUser) {
    return this.favorites.listIds(user.id);
  }

  @Put(':menuItemId')
  add(
    @CurrentUser() user: RequestUser,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.favorites.add(user.id, menuItemId);
  }

  @Delete(':menuItemId')
  @HttpCode(200)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.favorites.remove(user.id, menuItemId);
  }
}
