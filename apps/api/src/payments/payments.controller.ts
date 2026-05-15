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

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.payments.getConfig();
  }

  @Post('intent')
  createIntent(
    @CurrentUserOptional() user: OptionalUser | null,
    @Body(new ZodValidationPipe(CreatePaymentIntentSchema)) dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createIntent(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      dto,
    );
  }

  @Get('by-order/:orderId')
  byOrderId(
    @CurrentUserOptional() user: OptionalUser | null,
    @Param('orderId') orderId: string,
  ) {
    return this.payments.byOrderId(
      { userId: user?.id ?? null, permissions: user?.permissions ?? [] },
      orderId,
    );
  }

  @Post(':paymentId/refunds')
  @Permissions('payment:refund')
  @AuditAction('order:refund', 'payment')
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
