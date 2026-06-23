import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './setup-e2e';

describe('newsletter (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    await prisma.newsletterSubscriber.deleteMany({});
  });

  function inject(method: string, url: string, body?: unknown) {
    return app.inject({ method: method as 'POST', url, payload: body as never });
  }

  it('runs the double opt-in flow: subscribe → confirm → unsubscribe', async () => {
    const email = 'nl@example.com';

    // 1. Subscribe with consent → PENDING.
    const sub = await inject('POST', '/api/v1/newsletter/subscribe', {
      email,
      consent: true,
      locale: 'en',
      source: 'test',
    });
    expect(sub.statusCode).toBe(202);
    expect(sub.json().status).toBe('PENDING');

    const row = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    expect(row?.status).toBe('PENDING');
    expect(row?.token).toBeTruthy();
    const token = row?.token as string;

    // 2. Confirm with the token → CONFIRMED.
    const confirm = await inject('POST', '/api/v1/newsletter/confirm', { token });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().status).toBe('CONFIRMED');
    expect((await prisma.newsletterSubscriber.findUnique({ where: { email } }))?.status).toBe(
      'CONFIRMED',
    );

    // 3. Re-subscribing a confirmed address is idempotent (no re-confirm needed).
    const again = await inject('POST', '/api/v1/newsletter/subscribe', { email, consent: true });
    expect(again.json().status).toBe('CONFIRMED');

    // 4. Unsubscribe with the token → UNSUBSCRIBED.
    const unsub = await inject('POST', '/api/v1/newsletter/unsubscribe', { token });
    expect(unsub.statusCode).toBe(200);
    expect(unsub.json().status).toBe('UNSUBSCRIBED');
  });

  it('rejects subscription without explicit consent', async () => {
    const res = await inject('POST', '/api/v1/newsletter/subscribe', {
      email: 'noconsent@example.com',
      consent: false,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await inject('POST', '/api/v1/newsletter/subscribe', {
      email: 'not-an-email',
      consent: true,
    });
    expect(res.statusCode).toBe(400);
  });

  it('404s on an unknown confirm token', async () => {
    const res = await inject('POST', '/api/v1/newsletter/confirm', { token: 'does-not-exist-000' });
    expect(res.statusCode).toBe(404);
  });
});
