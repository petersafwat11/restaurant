import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookEventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Claim an event for processing. Returns `true` if the caller should process
   * it — either it's the first delivery, OR a prior delivery recorded it but
   * never finished (`processedAt` still null, i.e. its dispatch threw and Stripe
   * is retrying). Returns `false` only for a delivery that has already been
   * fully processed (`markProcessed`).
   *
   * This is the safety guarantee: a `payment_intent.succeeded` /
   * `charge.refunded` whose first dispatch failed transiently is re-processed on
   * Stripe's retry instead of being silently acked-and-dropped. Dispatch
   * handlers are idempotent, so re-processing an unfinished event is safe.
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
        // Already recorded — reprocess only if the prior delivery never
        // completed (its handler threw). A completed event is a true duplicate.
        const existing = await this.prisma.webhookEvent.findUnique({
          where: { id: input.id },
          select: { processedAt: true },
        });
        return existing?.processedAt == null;
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
