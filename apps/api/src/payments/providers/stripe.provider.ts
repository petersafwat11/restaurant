import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PaymentMethodKind, PaymentStatus } from '@repo/types';
import Stripe from 'stripe';
import { ENV, type ENV_TYPE } from '../../config/config.module';
import type {
  CreateIntentInput,
  CreateIntentResult,
  ParsedWebhookEvent,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from '../provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  readonly supports: ReadonlyArray<PaymentMethodKind> = [
    'STRIPE_CARD',
    'APPLE_PAY',
    'GOOGLE_PAY',
    'P24',
    'BLIK',
  ];

  private readonly logger = new Logger(StripeProvider.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  readonly stubMode: boolean;

  constructor(@Inject(ENV) private readonly env: ENV_TYPE) {
    this.stubMode = !env.STRIPE_SECRET_KEY;
    this.webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (this.stubMode) {
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe provider running in stub mode');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      });
    }
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    if (this.stubMode || !this.stripe) {
      // Deterministic stub so frontend can exercise the full flow in dev.
      const providerRef = `pi_stub_${input.orderId}`;
      return {
        providerRef,
        clientSecret: `${providerRef}_secret_stub`,
        confirmed: false,
      };
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: toMinorUnits(input.amount, input.currency),
      currency: input.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: input.metadata ?? {},
    });

    return {
      providerRef: intent.id,
      clientSecret: intent.client_secret,
      confirmed: false,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (this.stubMode || !this.stripe) {
      return {
        providerRef: `re_stub_${input.providerRef}`,
        amount: input.amount,
        status: 'REFUNDED' satisfies PaymentStatus,
      };
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: input.providerRef,
      amount: toMinorUnits(input.amount, 'usd'),
      reason: input.reason ? 'requested_by_customer' : undefined,
    });

    return {
      providerRef: refund.id,
      amount: input.amount,
      status: 'REFUNDED' satisfies PaymentStatus,
    };
  }

  parseWebhook(rawBody: Buffer, signature: string | undefined): ParsedWebhookEvent | null {
    if (this.stubMode || !this.stripe) {
      // In stub mode, accept JSON bodies verbatim — the frontend test client
      // signs nothing. Real prod always uses signature verification below.
      try {
        const raw = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
        return parsedFromStripeEvent(raw);
      } catch {
        return null;
      }
    }

    if (!signature || !this.webhookSecret) return null;

    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      return parsedFromStripeEvent(event);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      return null;
    }
  }
}

function parsedFromStripeEvent(event: Stripe.Event): ParsedWebhookEvent {
  const obj = (event.data?.object ?? {}) as {
    id?: string;
    payment_intent?: string | null;
    amount_refunded?: number;
    currency?: string;
    refunds?: { data?: Array<{ id: string; amount: number; reason?: string | null }> } | null;
  };
  const base: ParsedWebhookEvent = {
    id: event.id,
    type: event.type,
    paymentIntentId:
      event.type === 'charge.refunded'
        ? typeof obj.payment_intent === 'string'
          ? obj.payment_intent
          : undefined
        : obj.id,
    chargeId: event.type === 'charge.refunded' ? obj.id : undefined,
    raw: event,
  };

  if (event.type === 'charge.refunded') {
    const currency = obj.currency ?? 'usd';
    const refundsData = obj.refunds?.data ?? [];
    base.refunds = refundsData.map((r) => ({
      id: r.id,
      amount: fromMinorUnits(r.amount, currency),
      reason: r.reason ?? null,
    }));
    if (typeof obj.amount_refunded === 'number') {
      base.amountRefunded = fromMinorUnits(obj.amount_refunded, currency);
    }
  }

  return base;
}

/**
 * Convert a 2dp decimal string into Stripe minor units (e.g., "12.34" → 1234).
 * Zero-decimal currencies (JPY, KRW) aren't supported by the demo restaurant
 * but the helper guards against accidental misuse.
 */
function toMinorUnits(amount: string, currency: string): number {
  const zeroDecimal = ['JPY', 'KRW'];
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) throw new Error(`Invalid amount: ${amount}`);
  if (zeroDecimal.includes(currency.toUpperCase())) {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

function fromMinorUnits(minor: number, currency: string): string {
  const zeroDecimal = ['JPY', 'KRW'];
  if (zeroDecimal.includes(currency.toUpperCase())) {
    return minor.toFixed(2);
  }
  return (minor / 100).toFixed(2);
}
