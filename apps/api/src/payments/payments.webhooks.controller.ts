import {
  Controller,
  Headers,
  HttpCode,
  Logger,
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
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('eservice')
  @HttpCode(200)
  async eservice(
    @Req() req: FastifyRequest,
    @Headers('x-gp-signature') signature: string | undefined,
  ) {
    // Fastify exposes the parsed body on req.body; for signature verification
    // we need the raw bytes. The main bootstrap wires a contentTypeParser that
    // stores the raw body on `(req as any).rawBody` for this route only. The
    // JSON.stringify fallback is only reachable in stub mode (which skips
    // signature verification) — a real signature is computed over these exact
    // raw bytes, so re-serializing would break verification.
    const raw =
      (req as unknown as { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');

    // Log every inbound delivery before the signature check. As of 2026-07-09
    // eService is not delivering the status_url server-to-server in the sandbox
    // (confirmed: zero inbound POSTs after real payments — settle-on-return +
    // reconcile carry confirmation instead), so this line is the signal for when
    // that changes (e.g. once the notification URL is registered on the account).
    this.logger.log(
      `[ESERVICE_WEBHOOK_IN] content-type=${req.headers['content-type'] ?? 'none'} ` +
        `signature=${signature ? `present(${signature.length})` : 'MISSING'} ` +
        `rawBytes=${raw.length} ua=${req.headers['user-agent'] ?? 'none'}`,
    );

    await this.payments.handleEserviceWebhook(raw, signature);
    return { received: true as const };
  }
}
