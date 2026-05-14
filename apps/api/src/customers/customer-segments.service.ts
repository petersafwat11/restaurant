import { Injectable } from '@nestjs/common';
import type { CustomerSegment } from '@repo/types';

export interface SegmentInputs {
  lifetimeOrders: number;
  lifetimeSpend: number; // PLN as plain number
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  accountCreatedAt: Date;
  ordersLast90Days: number;
  /** "Now" anchor for tests. */
  now?: Date;
}

@Injectable()
export class CustomerSegmentsService {
  /**
   * Pure function so it's trivially unit-testable. Definitions per Sprint 7
   * defaults #13.
   */
  classify(input: SegmentInputs): CustomerSegment | null {
    const now = input.now ?? new Date();

    if (input.lifetimeOrders === 0) {
      const newAccount = now.getTime() - input.accountCreatedAt.getTime() <= 30 * 24 * 60 * 60_000;
      return newAccount ? 'new' : null;
    }

    if (input.lifetimeOrders >= 20 || input.lifetimeSpend >= 2000) return 'vip';
    if (input.ordersLast90Days >= 5) return 'frequent';

    if (input.lastOrderAt) {
      const sinceLast = now.getTime() - input.lastOrderAt.getTime();
      if (sinceLast > 60 * 24 * 60 * 60_000) return 'dormant';
    }

    const accountAge = now.getTime() - input.accountCreatedAt.getTime();
    if (accountAge <= 30 * 24 * 60 * 60_000 && input.lifetimeOrders <= 1) return 'new';

    return 'active';
  }
}
