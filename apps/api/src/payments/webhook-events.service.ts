import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookEventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attempt to record a new event id. Returns `true` if this is the first
   * delivery (caller should process the event), `false` if it's a duplicate
   * (caller should ack but skip handler logic).
   *
   * Relies on the primary-key uniqueness of `WebhookEvent.id`.
   */
  async recordIfNew(input: {
    id: string;
    provider: string;
    type: string;
    payload: unknown;
  }): Promise<boolean> {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          id: input.id,
          provider: input.provider,
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return false;
      }
      throw err;
    }
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }
}
