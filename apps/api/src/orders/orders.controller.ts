import {
  Body,
  Controller,
  type ExecutionContext,
  Get,
  Headers,
  Param,
  Post,
  Query,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CreateOrderDto,
  CreateOrderSchema,
  type OrderListQuery,
  OrderListQuerySchema,
  type UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OrdersService } from './orders.service';

interface OptionalUser {
  id?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OptionalUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: OptionalUser }>();
    return req.user ?? null;
  },
);

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Public so guest carts can place an order. The service derives identity
  // from the (optional) authed user or the supplied sessionKey.
  @Public()
  @Post()
  @AuditAction('order:create', 'order')
  create(
    @CurrentUserOptional() user: OptionalUser | null,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.orders.create(
      {
        userId: user?.id ?? null,
        sessionKey: dto.sessionKey ?? null,
        permissions: user?.permissions ?? [],
      },
      idempotencyKey,
      dto,
    );
  }

  @Get()
  list(
    @CurrentUserOptional() user: OptionalUser | null,
    @Query(new ZodValidationPipe(OrderListQuerySchema)) query: OrderListQuery,
  ) {
    return this.orders.list(
      {
        userId: user?.id ?? null,
        sessionKey: null,
        permissions: user?.permissions ?? [],
      },
      query,
    );
  }

  @Get(':id')
  getById(
    @CurrentUserOptional() user: OptionalUser | null,
    @Param('id') id: string,
  ) {
    return this.orders.getById(
      {
        userId: user?.id ?? null,
        sessionKey: null,
        permissions: user?.permissions ?? [],
      },
      id,
    );
  }

  @Post(':id/status')
  @AuditAction('order:status_changed', 'order')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderStatusSchema)) dto: UpdateOrderStatusDto,
  ) {
    return this.orders.transition(
      {
        userId: user.id,
        sessionKey: null,
        permissions: user.permissions,
        roles: user.roles,
      },
      id,
      dto.to,
      dto.note ?? null,
      dto.reason ?? null,
    );
  }
}
