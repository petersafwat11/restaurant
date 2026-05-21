import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  ensureOwnerToken,
  ensureRestaurant,
  resetDb,
  resetMenuDb,
} from './setup-e2e';

describe('customers export (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;
  let customerToken: string;

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
    // The export endpoint resolves a per-tenant slug for the filename — no
    // Restaurant row → NotFoundException → 404. Seed one before the test.
    await ensureRestaurant(app);

    for (const email of [
      'alice.cust.e2e@test.local',
      'bob.cust.e2e@test.local',
      'charlie.cust.e2e@test.local',
    ]) {
      await inject('POST', '/api/v1/auth/register', {
        email,
        password: 'Password123!',
      });
    }

    // Hold one customer's token for the permission test below.
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'denied.cust.e2e@test.local',
      password: 'Password123!',
    });
    customerToken = reg.json().accessToken;
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('downloads a CSV with all customers', async () => {
    const res = await inject(
      'GET',
      '/api/v1/admin/customers/export?format=csv',
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.+customers-/);
    expect(res.payload.charCodeAt(0)).toBe(0xfeff);
    expect(res.payload).toContain(
      'Customer,Phone,Orders,Lifetime spend,Last order,Segment',
    );
    // At least 4 e2e customers + 1 owner — but owner has no customer role,
    // so the where clause filters them out. Expect ≥ 4 rows + 1 header.
    const lines = res.payload.split('\r\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it('downloads a PDF', async () => {
    const res = await inject(
      'GET',
      '/api/v1/admin/customers/export?format=pdf',
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.rawPayload.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('applies the search filter', async () => {
    const res = await inject(
      'GET',
      '/api/v1/admin/customers/export?format=csv&search=alice',
      undefined,
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    const lines = res.payload.split('\r\n').filter(Boolean);
    // Header + just alice's row.
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('alice.cust.e2e@test.local');
  });

  it('requires customer:read — customer token gets 403', async () => {
    const res = await inject(
      'GET',
      '/api/v1/admin/customers/export?format=csv',
      undefined,
      customerToken,
    );
    expect(res.statusCode).toBe(403);
  });
});
