import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@ApiTags('payments-webhooks')
@Controller('payments/webhooks')
export class PaymentsWebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('stripe')
  @HttpCode(200)
  async stripe(
    @Req() req: FastifyRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    // Fastify exposes the parsed body on req.body; for signature verification
    // we need the raw bytes. The mainBootstrap wires a contentTypeParser that
    // stores the raw body on `(req as any).rawBody` for this route only.
    const raw =
      (req as unknown as { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');

    await this.payments.handleStripeWebhook(raw, signature);
    return { received: true as const };
  }
}
