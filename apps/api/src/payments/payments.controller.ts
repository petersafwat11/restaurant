import {
  All,
  Body,
  Controller,
  type ExecutionContext,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
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
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
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

  // eService HPP return landing (public, browser-facing). eService POSTs (verified
  // in sandbox — a GET-only route 404s) the transaction result to `return_url` and
  // renders the response in the browser; we return HTML that bounces the top window
  // to the web confirmation flow. `@All` handles both verbs; orderId is on the query
  // (we set it), status comes from eService's form body (fallback: query).
  @Public()
  @All('eservice/return')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async eserviceReturn(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Headers('x-gp-signature') headerSignature: string | undefined,
    @Query('orderId') orderId?: string,
    @Query('status') queryStatus?: string,
    @Body() body?: Record<string, string>,
  ): Promise<string> {
    const rawBody =
      (req as unknown as { rawBody?: Buffer }).rawBody ??
      Buffer.from(
        req.method === 'POST' && body ? new URLSearchParams(body).toString() : '',
        'utf8',
      );
    const rawUrl = req.raw.url ?? req.url;
    if (
      !this.payments.verifyEserviceReturnNotification({
        method: req.method,
        rawUrl,
        rawBody,
        headerSignature,
      })
    ) {
      reply.status(400);
      return '<!doctype html><html><body>Invalid payment return notification.</body></html>';
    }

    // Settle the order from eService's authoritative record now — instant confirm,
    // independent of the status_url webhook. One synchronous attempt catches a
    // fast capture so the customer lands on a confirmed order; if the transaction
    // isn't captured yet (eService can lag the return by tens of seconds), keep
    // polling in the BACKGROUND so the order confirms + its cart clears within
    // ~1 min — never blocking the redirect. The reconcile job is the final backstop.
    let resolvedStatus = queryStatus ?? body?.status;
    if (orderId) {
      const syncResult = await this.payments
        .syncEserviceOrderFromProvider(orderId)
        .catch(() => 'pending' as const);
      if (syncResult === 'paid') resolvedStatus = 'CAPTURED';
      if (syncResult === 'failed') resolvedStatus = 'DECLINED';
      if (syncResult === 'pending') {
        void this.payments.retrySyncEserviceOrder(orderId).catch(() => undefined);
      }
    }
    return this.payments.buildReturnRedirectHtml(orderId, resolvedStatus);
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
