import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PaymentMethodKind, PaymentStatus } from '@repo/types';
import { fromMinorUnits, toMinorUnits } from '@repo/utils/money';
import Stripe from 'stripe';
import { ENV, type ENV_TYPE } from '../../config/config.module';
import type {
  CreateIntentInput,
  CreateIntentResult,
  NormalizedIntentStatus,
  ParsedWebhookEvent,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from '../provider.interface';
import { stripePaymentMethodTypes } from '../stripe-intent';

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
    // Exactly the method the customer chose — never automatic_payment_methods,
    // which would surface other methods (plan §F3).
    const methodTypes = stripePaymentMethodTypes(input.methodKind);

    if (this.stubMode || !this.stripe) {
      // Deterministic stub so the frontend can exercise the full flow in dev.
      // Method-distinct so the reuse / method-switch logic is exercisable here.
      const providerRef = `pi_stub_${input.orderId}_${input.methodKind}`;
      return {
        providerRef,
        clientSecret: `${providerRef}_secret_stub`,
        confirmed: false,
      };
    }

    const intent = await this.stripe.paymentIntents.create(
      {
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency.toLowerCase(),
        payment_method_types: methodTypes,
        metadata: input.metadata ?? {},
      },
      // Deterministic key → Stripe returns the same intent for concurrent /
      // repeated same-method calls, preventing duplicate active intents (§F2).
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );

    return {
      providerRef: intent.id,
      clientSecret: intent.client_secret,
      confirmed: false,
    };
  }

  async cancelIntent(providerRef: string): Promise<void> {
    if (this.stubMode || !this.stripe) return;
    try {
      await this.stripe.paymentIntents.cancel(providerRef);
    } catch (err) {
      // Already-canceled/succeeded intents can't be canceled — that's fine, the
      // goal (no lingering confirmable intent for the old method) still holds.
      this.logger.warn(`Stripe cancelIntent(${providerRef}) skipped: ${(err as Error).message}`);
    }
  }

  async retrieveIntentStatus(providerRef: string): Promise<NormalizedIntentStatus | null> {
    // Stub mode can't talk to Stripe — signal "unknown source" so the
    // reconciliation job leaves the row alone rather than guessing.
    if (this.stubMode || !this.stripe) return null;
    try {
      const intent = await this.stripe.paymentIntents.retrieve(providerRef);
      switch (intent.status) {
        case 'succeeded':
          return 'succeeded';
        case 'canceled':
          return 'canceled';
        case 'processing':
          return 'processing';
        case 'requires_payment_method':
        // This is ALSO the status of a brand-new, never-confirmed intent and of
        // an intent between attempts — not necessarily a failure. Treat it as
        // "customer hasn't finished" so reconciliation LEAVES it (doesn't mark a
        // still-usable abandoned intent FAILED out from under the customer).
        case 'requires_action':
        case 'requires_confirmation':
        case 'requires_capture':
          return 'requires_action';
        default:
          return 'unknown';
      }
    } catch (err) {
      this.logger.warn(`Stripe retrieveIntentStatus(${providerRef}) failed: ${(err as Error).message}`);
      return null;
    }
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
      amount: toMinorUnits(input.amount, input.currency),
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
