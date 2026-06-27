import {
  Body,
  Controller,
  type ExecutionContext,
  Get,
  Param,
  Post,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CreatePaymentIntentDto,
  CreatePaymentIntentSchema,
  type CreateRefundDto,
  CreateRefundSchema,
} from '@repo/types';
import { AuditAction } from '../audit-log/audit.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaymentsService } from './payments.service';

interface OptionalUser {
  id?: string;
  permissions?: string[];
}

const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OptionalUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: OptionalUser }>();
    return req.user ?? null;
  },
);

// Signed guest order token (plan §F1). Read from the `X-Order-Token` header so
// guests can pay for / recover an order without an auth session. Never logged.
const OrderTokenHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const raw = req.headers?.['x-order-token'];
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  },
);

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.payments.getConfig();
  }

  // Public so guests can pay; authorization is by the authed user OR a valid
  // signed order token (plan §F1).
  @Public()
  // Card-testing control (§I2): cap intent creation per user/IP.
  @RateLimit({ name: 'payment:intent', limit: 15, windowSeconds: 300 })
  @Post('intent')
  createIntent(
    @CurrentUserOptional() user: OptionalUser | null,
    @OrderTokenHeader() orderToken: string | null,
    @Body(new ZodValidationPipe(CreatePaymentIntentSchema)) dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createIntent(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      dto,
      orderToken,
    );
  }

  // Public payment-status recovery — guest confirmation page reads its payment
  // status via the signed order token (plan §F1/§F4).
  @Public()
  @RateLimit({ name: 'payment:by-order', limit: 60, windowSeconds: 300 })
  @Get('by-order/:orderId')
  byOrderId(
    @CurrentUserOptional() user: OptionalUser | null,
    @OrderTokenHeader() orderToken: string | null,
    @Param('orderId') orderId: string,
  ) {
    return this.payments.byOrderId(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      orderId,
      orderToken,
    );
  }

  @Post(':paymentId/refunds')
  @Permissions('payment:refund')
  // idFrom='paymentId' → RefundDto.paymentId, so the audit row points at the
  // payment (resourceType), not the refund id.
  @AuditAction('order:refund', 'payment', { idFrom: 'paymentId' })
  refund(
    @CurrentUserOptional() user: OptionalUser | null,
    @Param('paymentId') paymentId: string,
    @Body(new ZodValidationPipe(CreateRefundSchema)) dto: CreateRefundDto,
  ) {
    return this.payments.refund(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      paymentId,
      dto,
    );
  }
}
