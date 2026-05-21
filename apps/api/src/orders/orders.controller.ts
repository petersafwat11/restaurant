import {
  BadRequestException,
  Body,
  Controller,
  type ExecutionContext,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AddOrderNoteDto,
  AddOrderNoteSchema,
  type CreateOrderDto,
  CreateOrderSchema,
  type OrderExportQuery,
  OrderExportQuerySchema,
  type OrderListQuery,
  OrderListQuerySchema,
  type UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
} from '@repo/types';
import type { FastifyReply } from 'fastify';
import { AuditAction } from '../audit-log/audit.decorator';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  signOrderTrackingToken,
  verifyOrderTrackingToken,
} from './order-tracking-token';
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

  // Public token-authenticated tracking endpoint for email deep-links.
  // URL shape: /api/v1/orders/track?token=<base64url-payload>.<base64url-sig>
  // Declared before `:id` so the `track` segment isn't swallowed as an id.
  @Public()
  @Get('track')
  trackByToken(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Missing token');
    const result = verifyOrderTrackingToken(token);
    if (!result.ok) {
      if (result.reason === 'expired') {
        throw new ForbiddenException('Tracking link expired');
      }
      // Don't differentiate malformed vs invalid_signature to avoid leaking
      // signing-oracle hints.
      throw new NotFoundException('Order not found');
    }
    return this.orders.getTrackingByVerifiedToken(result.orderId);
  }

  // Public — full OrderDto read via a signed HMAC token. Used by the guest
  // checkout-success page on refresh (cache is gone, no auth header to send,
  // but the URL carries the token issued at order creation). Declared before
  // the `:id` route so the `by-token` segment isn't swallowed as an id.
  @Public()
  @Get('by-token')
  getByToken(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Missing token');
    const result = verifyOrderTrackingToken(token);
    if (!result.ok) {
      if (result.reason === 'expired') {
        throw new ForbiddenException('Tracking link expired');
      }
      throw new NotFoundException('Order not found');
    }
    return this.orders.getByVerifiedToken(result.orderId);
  }

  // Admin CSV/PDF export of the orders list — same filters as `list`,
  // no pagination. Declared before `:id` so the `export` segment isn't
  // swallowed as an id.
  @Permissions('order:read')
  @Get('export')
  async exportList(
    @Query(new ZodValidationPipe(OrderExportQuerySchema)) query: OrderExportQuery,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.orders.exportList(query);
    reply.header('Content-Type', file.contentType);
    reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
    reply.send(file.content);
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

  @Get(':id/tracking')
  getTracking(
    @CurrentUserOptional() user: OptionalUser | null,
    @Param('id') id: string,
  ) {
    return this.orders.getTracking(
      {
        userId: user?.id ?? null,
        sessionKey: null,
        permissions: user?.permissions ?? [],
      },
      id,
    );
  }

  // Issues a signed tracking token for the authenticated owner. The frontend
  // confirmation page calls this to render the shareable email-style link.
  @Get(':id/tracking-token')
  async issueTrackingToken(
    @CurrentUserOptional() user: OptionalUser | null,
    @Param('id') id: string,
  ) {
    // Reuse the owner/permission check by loading the order; throws 404 if
    // the caller isn't allowed.
    await this.orders.getTracking(
      {
        userId: user?.id ?? null,
        sessionKey: null,
        permissions: user?.permissions ?? [],
      },
      id,
    );
    return { token: signOrderTrackingToken(id) };
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

  @Post(':id/notes')
  @AuditAction('order:note_added', 'order')
  addNote(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddOrderNoteSchema)) dto: AddOrderNoteDto,
  ) {
    return this.orders.addNote(
      { userId: user.id, permissions: user.permissions },
      id,
      dto.note,
    );
  }
}
