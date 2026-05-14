import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PaymentMethodKind, PaymentStatus } from '@repo/types';
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from '../provider.interface';

@Injectable()
export class CodProvider implements PaymentProvider {
  readonly id = 'cod' as const;
  readonly supports: ReadonlyArray<PaymentMethodKind> = ['COD'];

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    // COD short-circuits: no provider call, order is auto-confirmed by the
    // payments service after we return.
    return {
      providerRef: `cod_${input.orderId}`,
      clientSecret: null,
      confirmed: true,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // For COD we just record the refund in the database; no provider call.
    return {
      providerRef: `cod_refund_${randomUUID()}`,
      amount: input.amount,
      status: 'REFUNDED' satisfies PaymentStatus,
    };
  }
}
