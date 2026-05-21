import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('audit log resourceType filter (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let actorId: string;

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

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    actorId = me.json().id as string;

    // Seed audit rows directly so we don't depend on async queue write timing.
    const prisma = app.get(PrismaService);
    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: actorId,
          action: 'order:create',
          resourceType: 'order',
          resourceId: 'ord_1',
        },
        {
          actorUserId: actorId,
          action: 'order:status_changed',
          resourceType: 'order',
          resourceId: 'ord_2',
        },
        {
          actorUserId: actorId,
          action: 'menu:item:write',
          resourceType: 'menu_item',
          resourceId: 'mi_1',
        },
        {
          actorUserId: actorId,
          action: 'promotion:write',
          resourceType: 'promotion',
          resourceId: 'pr_1',
        },
      ],
    });
  });

  async function inject(url: string) {
    return app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
  }

  it('returns only the rows matching the resourceType filter', async () => {
    const orders = await inject('/api/v1/admin/audit-log?resourceType=order');
    expect(orders.statusCode).toBe(200);
    const items = orders.json().items as Array<{ resourceType: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.resourceType === 'order')).toBe(true);
  });

  it('combines resourceType with action filter', async () => {
    const res = await inject(
      '/api/v1/admin/audit-log?resourceType=order&action=order%3Acreate',
    );
    const items = res.json().items as Array<{ resourceType: string; action: string }>;
    expect(items.every((i) => i.resourceType === 'order' && i.action === 'order:create')).toBe(
      true,
    );
  });

  it('returns an empty list when no rows match', async () => {
    const res = await inject('/api/v1/admin/audit-log?resourceType=nonexistent');
    expect(res.json().items).toEqual([]);
  });
});
