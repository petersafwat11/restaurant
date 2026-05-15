import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('feature-flags (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let userToken: string;

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
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'flags.e2e@test.local',
      password: 'Password123!',
    });
    userToken = reg.json().accessToken;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('serves resolved flags publicly with catalog defaults', async () => {
    const res = await inject('GET', '/api/v1/feature-flags');
    expect(res.statusCode).toBe(200);
    expect(res.json().flags['loyalty.redemption']).toBe(true);
    expect(res.json().flags.soft_launch).toBe(false);
  });

  it('admin list requires flags:write', async () => {
    const forbidden = await inject('GET', '/api/v1/admin/feature-flags', undefined, userToken);
    expect(forbidden.statusCode).toBe(403);

    const ok = await inject('GET', '/api/v1/admin/feature-flags', undefined, ownerToken);
    expect(ok.statusCode).toBe(200);
    expect(ok.json().items.length).toBeGreaterThan(0);
  });

  it('admin can flip a flag and it reflects in the resolved map', async () => {
    const patch = await inject(
      'PATCH',
      '/api/v1/admin/feature-flags/soft_launch',
      { enabled: true, rolloutPercent: 100 },
      ownerToken,
    );
    expect(patch.statusCode).toBe(200);
    expect(patch.json().enabled).toBe(true);

    const resolved = await inject('GET', '/api/v1/feature-flags');
    expect(resolved.json().flags.soft_launch).toBe(true);
  });

  it('rejects an unknown flag key', async () => {
    const res = await inject(
      'PATCH',
      '/api/v1/admin/feature-flags/not_a_flag',
      { enabled: true },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });
});
