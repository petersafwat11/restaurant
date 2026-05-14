import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Atomic, monotonic order-number generator backed by the Postgres sequence
 * `order_number_seq` (see migration `20260514160000_add_order_number_sequence`).
 *
 * Format: `R-{YYYY}-{NNNNNN}` — year reflects the order's createdAt year and
 * the sequence number is the raw sequence value zero-padded to 6 digits.
 * Sequence does not reset on year rollover; that's intentional — uniqueness
 * is guaranteed across years and the human-readable year is informational.
 */
@Injectable()
export class OrderNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async next(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('order_number_seq') AS nextval
    `;
    const seq = rows[0]?.nextval;
    if (seq === undefined) {
      throw new Error('Failed to fetch next order number from sequence');
    }
    const year = new Date().getFullYear();
    return `R-${year}-${seq.toString().padStart(6, '0')}`;
  }
}
