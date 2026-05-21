import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('customers tags + broadcast email (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let customerIds: string[];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    ownerToken = await ensureOwnerToken(app);

    customerIds = [];
    for (const email of ['c1.e2e@test.local', 'c2.e2e@test.local', 'c3.e2e@test.local']) {
      const reg = await inject('POST', '/api/v1/auth/register', {
        email,
        password: 'Password123!',
      });
      customerIds.push(reg.json().user.id);
    }
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('creates a tag, bulk-applies it, then removes it', async () => {
    const created = await inject(
      'POST',
      '/api/v1/admin/customers/tags',
      { slug: 'vip-2026', label: 'VIP 2026', color: '#7FE8C8' },
      ownerToken,
    );
    expect(created.statusCode).toBe(201);
    const tagId = created.json().id;

    const list = await inject(
      'GET',
      '/api/v1/admin/customers/tags/all',
      undefined,
      ownerToken,
    );
    expect(list.json().map((t: { id: string }) => t.id)).toContain(tagId);

    const applied = await inject(
      'POST',
      '/api/v1/admin/customers/bulk/tags',
      { userIds: customerIds, tagId, action: 'ADD' },
      ownerToken,
    );
    expect(applied.statusCode).toBe(200);
    expect(applied.json().affected).toBe(3);

    // Re-applying is idempotent (skipDuplicates) — affected count is 0.
    const reapplied = await inject(
      'POST',
      '/api/v1/admin/customers/bulk/tags',
      { userIds: customerIds, tagId, action: 'ADD' },
      ownerToken,
    );
    expect(reapplied.json().affected).toBe(0);

    const removed = await inject(
      'POST',
      '/api/v1/admin/customers/bulk/tags',
      { userIds: customerIds.slice(0, 2), tagId, action: 'REMOVE' },
      ownerToken,
    );
    expect(removed.json().affected).toBe(2);

    const remaining = await app.get(PrismaService).userTag.findMany({ where: { tagId } });
    expect(remaining).toHaveLength(1);
  });

  it('rejects duplicate tag slugs', async () => {
    await inject(
      'POST',
      '/api/v1/admin/customers/tags',
      { slug: 'newsletter', label: 'Newsletter' },
      ownerToken,
    );
    const dup = await inject(
      'POST',
      '/api/v1/admin/customers/tags',
      { slug: 'newsletter', label: 'Other' },
      ownerToken,
    );
    expect(dup.statusCode).toBe(400);
  });

  it('queues a broadcast email to the given userIds and returns a campaign id', async () => {
    const res = await inject(
      'POST',
      '/api/v1/admin/customers/bulk/email',
      {
        subject: 'Spring menu launch',
        body: 'New seasonal dishes available now.',
        userIds: customerIds,
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(202);
    expect(res.json().queued).toBe(3);
    expect(typeof res.json().campaignId).toBe('string');
    expect(res.json().campaignId.length).toBeGreaterThan(0);
  });

  it('rejects a broadcast with neither userIds nor segment', async () => {
    const res = await inject(
      'POST',
      '/api/v1/admin/customers/bulk/email',
      { subject: 'hello', body: 'world' },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });
});
