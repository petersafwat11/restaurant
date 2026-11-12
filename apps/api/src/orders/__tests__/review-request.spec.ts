import { JOB_ORDER_REVIEW_REQUEST, REVIEW_REQUEST_DELAY_MS } from '@repo/jobs';
import { describe, expect, it, vi } from 'vitest';

// The service injects the ENV token; avoid evaluating the real env schema.
vi.mock('../../config/config.module', () => ({ ENV: 'ENV' }));
import {
  ReviewRequestService,
  isReviewTrigger,
  reviewRequestJobId,
} from '../review-request.service';

const REVIEW_URL = 'https://g.page/r/CVAovYDd9tytEBM/review';

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'R-2026-000001',
    status: 'DELIVERED',
    userId: null,
    customerName: 'Anna Kowalska',
    customerEmail: 'anna@example.test',
    checkoutLocale: 'pl',
    reviewRequestSentAt: null,
    ...overrides,
  };
}

function setup(
  opts: {
    order?: Record<string, unknown> | null;
    claimCount?: number;
    reviewUrl?: string | null;
    prefs?: { orderUpdatesEmail: boolean } | null;
    subscriber?: { status: string } | null;
    mailConfigured?: boolean;
    sendError?: Error;
  } = {},
) {
  const updateMany = vi.fn().mockResolvedValue({ count: opts.claimCount ?? 1 });
  const prisma = {
    order: {
      findUnique: vi.fn().mockResolvedValue(opts.order === undefined ? baseOrder() : opts.order),
      updateMany,
    },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    restaurant: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ googleReviewUrl: opts.reviewUrl === undefined ? REVIEW_URL : opts.reviewUrl }),
    },
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(opts.prefs ?? null) },
    newsletterSubscriber: { findUnique: vi.fn().mockResolvedValue(opts.subscriber ?? null) },
  };
  const send = opts.sendError
    ? vi.fn().mockRejectedValue(opts.sendError)
    : vi.fn().mockResolvedValue(undefined);
  const mailer = { isConfigured: () => opts.mailConfigured ?? true, send };
  const queue = { add: vi.fn().mockResolvedValue({}) };
  const env = { APP_URL_WEB: 'https://szefdonald.test' };
  const svc = new ReviewRequestService(prisma as never, mailer as never, env as never, queue as never);
  return { svc, prisma, send, queue, updateMany };
}

describe('review request scheduling', () => {
  it('triggers on DELIVERED for delivery and on COMPLETED for pickup / dine-in', () => {
    expect(isReviewTrigger('DELIVERY', 'DELIVERED')).toBe(true);
    expect(isReviewTrigger('DELIVERY', 'COMPLETED')).toBe(false); // auto-archive after delivery
    expect(isReviewTrigger('PICKUP', 'COMPLETED')).toBe(true);
    expect(isReviewTrigger('DINE_IN', 'COMPLETED')).toBe(true);
    expect(isReviewTrigger('PICKUP', 'READY')).toBe(false);
    expect(isReviewTrigger('DELIVERY', 'CANCELLED')).toBe(false);
  });

  it('enqueues one delayed job with a deterministic id', async () => {
    const { svc, queue } = setup();
    await expect(svc.scheduleFor('order-1', 'DELIVERY', 'DELIVERED')).resolves.toBe(true);
    expect(queue.add).toHaveBeenCalledWith(
      JOB_ORDER_REVIEW_REQUEST,
      { orderId: 'order-1' },
      expect.objectContaining({
        delay: REVIEW_REQUEST_DELAY_MS,
        jobId: reviewRequestJobId('order-1'),
      }),
    );
    expect(REVIEW_REQUEST_DELAY_MS).toBe(60 * 60 * 1000);
  });

  it('does not enqueue for non-trigger transitions', async () => {
    const { svc, queue } = setup();
    await svc.scheduleFor('order-1', 'DELIVERY', 'OUT_FOR_DELIVERY');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('never throws when the queue is down', async () => {
    const { svc, queue } = setup();
    queue.add.mockRejectedValueOnce(new Error('redis down'));
    await expect(svc.scheduleFor('order-1', 'PICKUP', 'COMPLETED')).resolves.toBe(false);
  });
});

describe('review request sending', () => {
  it('sends one Polish email with the Google review button and claims the order', async () => {
    const { svc, send, updateMany } = setup();
    await expect(svc.send('order-1')).resolves.toBe('sent');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', reviewRequestSentAt: null },
      data: { reviewRequestSentAt: expect.any(Date) },
    });
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0]?.[0];
    expect(mail.to).toBe('anna@example.test');
    expect(mail.html).toContain('Oceń nas w Google');
    expect(mail.html).toContain(REVIEW_URL);
  });

  it('is idempotent: already-sent orders are skipped', async () => {
    const { svc, send } = setup({ order: baseOrder({ reviewRequestSentAt: new Date() }) });
    await expect(svc.send('order-1')).resolves.toBe('already-sent');
    expect(send).not.toHaveBeenCalled();
  });

  it('is idempotent under a race: a lost claim sends nothing', async () => {
    const { svc, send } = setup({ claimCount: 0 });
    await expect(svc.send('order-1')).resolves.toBe('already-sent');
    expect(send).not.toHaveBeenCalled();
  });

  it('skips cancelled / refunded orders', async () => {
    for (const status of ['CANCELLED', 'REFUNDED']) {
      const { svc, send } = setup({ order: baseOrder({ status }) });
      await expect(svc.send('order-1')).resolves.toBe('not-eligible-status');
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('skips orders without an email address', async () => {
    const { svc, send } = setup({ order: baseOrder({ customerEmail: null }) });
    await expect(svc.send('order-1')).resolves.toBe('no-email');
    expect(send).not.toHaveBeenCalled();
  });

  it('respects opt-outs (user preference and unsubscribed address)', async () => {
    const user = setup({
      order: baseOrder({ userId: 'u1' }),
      prefs: { orderUpdatesEmail: false },
    });
    await expect(user.svc.send('order-1')).resolves.toBe('opted-out');
    const guest = setup({ subscriber: { status: 'UNSUBSCRIBED' } });
    await expect(guest.svc.send('order-1')).resolves.toBe('opted-out');
    expect(user.send).not.toHaveBeenCalled();
    expect(guest.send).not.toHaveBeenCalled();
  });

  it('skips when no review link is configured', async () => {
    const { svc, send } = setup({ reviewUrl: null });
    await expect(svc.send('order-1')).resolves.toBe('no-review-url');
    expect(send).not.toHaveBeenCalled();
  });

  it('skips safely when no mail transport is configured', async () => {
    const { svc, send, updateMany } = setup({ mailConfigured: false });
    await expect(svc.send('order-1')).resolves.toBe('mail-not-configured');
    expect(send).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('releases the claim and rethrows on send failure so BullMQ can retry', async () => {
    const { svc, updateMany } = setup({ sendError: new Error('smtp down') });
    await expect(svc.send('order-1')).rejects.toThrow('smtp down');
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'order-1' },
      data: { reviewRequestSentAt: null },
    });
  });

  it('writes English copy for English checkouts', async () => {
    const { svc, send } = setup({ order: baseOrder({ checkoutLocale: 'en' }) });
    await svc.send('order-1');
    expect(send.mock.calls[0]?.[0].html).toContain('Review us on Google');
  });
});
