import {
  Body,
  Controller,
  Delete,
  type ExecutionContext,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AddCartItemDto,
  AddCartItemSchema,
  type ApplyCouponDto,
  ApplyCouponSchema,
  type MergeCartDto,
  MergeCartSchema,
  type UpdateCartItemDto,
  UpdateCartItemSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CartService } from './cart.service';

interface OptionalUser {
  id?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

// Module-scoped helper: same as @CurrentUser but doesn't throw when missing —
// public routes that *optionally* recognize the caller need this. Declared
// before the @Controller class so decorators see it at evaluation time.
const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OptionalUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: OptionalUser }>();
    return req.user ?? null;
  },
);

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Public()
  @Get()
  get(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('restaurantId') restaurantId: string,
    @Query('sessionKey') sessionKey: string | undefined,
  ) {
    return this.cart.getCart(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      restaurantId,
    );
  }

  @Public()
  @Post('items')
  addItem(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('restaurantId') restaurantId: string,
    @Query('sessionKey') sessionKey: string | undefined,
    @Body(new ZodValidationPipe(AddCartItemSchema)) dto: AddCartItemDto,
  ) {
    return this.cart.addItem(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      restaurantId,
      dto,
    );
  }

  @Public()
  @Patch('items/:id')
  updateItem(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('sessionKey') sessionKey: string | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCartItemSchema)) dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      id,
      dto,
    );
  }

  @Public()
  @Delete('items/:id')
  @HttpCode(200)
  removeItem(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('sessionKey') sessionKey: string | undefined,
    @Param('id') id: string,
  ) {
    return this.cart.removeItem(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      id,
    );
  }

  @Public()
  @Delete()
  @HttpCode(200)
  clear(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('restaurantId') restaurantId: string,
    @Query('sessionKey') sessionKey: string | undefined,
  ) {
    return this.cart.clearCart(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      restaurantId,
    );
  }

  @Post('merge')
  merge(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(MergeCartSchema)) dto: MergeCartDto,
  ) {
    return this.cart.mergeOnLogin(user.id, dto);
  }

  @Public()
  @Post('coupon')
  applyCoupon(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('restaurantId') restaurantId: string,
    @Query('sessionKey') sessionKey: string | undefined,
    @Body(new ZodValidationPipe(ApplyCouponSchema)) dto: ApplyCouponDto,
  ) {
    return this.cart.applyCoupon(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      restaurantId,
      dto,
    );
  }

  @Public()
  @Delete('coupon')
  removeCoupon(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query('restaurantId') restaurantId: string,
    @Query('sessionKey') sessionKey: string | undefined,
  ) {
    return this.cart.removeCoupon(
      { userId: user?.id ?? null, sessionKey: sessionKey ?? null },
      restaurantId,
    );
  }
}
