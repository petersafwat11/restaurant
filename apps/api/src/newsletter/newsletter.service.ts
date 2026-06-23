import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { JOB_EMAIL_NEWSLETTER_CONFIRM, QUEUE_EMAIL } from '@repo/jobs';
import type { NewsletterResultDto, NewsletterSubscribeDto } from '@repo/types';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

function webBase(): string {
  return (process.env.APP_URL_WEB || 'http://localhost:3000').replace(/\/+$/, '');
}

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  async subscribe(dto: NewsletterSubscribeDto, ip: string | null): Promise<NewsletterResultDto> {
    await this.assertNotThrottled(ip);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });

    // Already confirmed → idempotent, don't re-send a confirmation email.
    if (existing?.status === 'CONFIRMED') {
      return { status: 'CONFIRMED' };
    }

    const token = randomBytes(24).toString('hex');
    const row = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        locale: dto.locale ?? 'pl',
        source: dto.source ?? null,
        status: 'PENDING',
        token,
        consentAt: new Date(),
      },
      // Re-subscribing a pending/unsubscribed address: fresh token + consent,
      // back to PENDING so they must re-confirm.
      update: {
        status: 'PENDING',
        token,
        locale: dto.locale ?? existing?.locale ?? 'pl',
        source: dto.source ?? existing?.source ?? null,
        consentAt: new Date(),
        confirmedAt: null,
        unsubscribedAt: null,
      },
    });

    const base = webBase();
    await this.emailQueue.add(JOB_EMAIL_NEWSLETTER_CONFIRM, {
      email: row.email,
      confirmUrl: `${base}/newsletter/confirm?token=${row.token}`,
      unsubscribeUrl: `${base}/newsletter/unsubscribe?token=${row.token}`,
    });

    return { status: 'PENDING' };
  }

  async confirm(token: string): Promise<NewsletterResultDto> {
    const row = await this.prisma.newsletterSubscriber.findUnique({ where: { token } });
    if (!row) throw new NotFoundException('Invalid or expired confirmation link.');
    if (row.status === 'CONFIRMED') return { status: 'CONFIRMED' };
    await this.prisma.newsletterSubscriber.update({
      where: { id: row.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    return { status: 'CONFIRMED' };
  }

  async unsubscribe(token: string): Promise<NewsletterResultDto> {
    const row = await this.prisma.newsletterSubscriber.findUnique({ where: { token } });
    if (!row) throw new NotFoundException('Invalid or expired unsubscribe link.');
    if (row.status === 'UNSUBSCRIBED') return { status: 'UNSUBSCRIBED' };
    await this.prisma.newsletterSubscriber.update({
      where: { id: row.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    return { status: 'UNSUBSCRIBED' };
  }

  private async assertNotThrottled(ip: string | null): Promise<void> {
    if (!ip) return;
    const key = `newsletter:rl:${ip}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, RATE_WINDOW_SECONDS);
    if (count > RATE_LIMIT) {
      throw new HttpException('Too many requests, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
