import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('contact (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;

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
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('accepts a public submission and lists it for admins', async () => {
    const res = await inject('POST', '/api/v1/contact', {
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Hi',
      message: 'Catering?',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('new');

    const list = await inject(
      'GET',
      '/api/v1/admin/contact',
      undefined,
      ownerToken,
    );
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(1);

    const id = list.json().items[0].id;
    const patched = await inject(
      'PATCH',
      `/api/v1/admin/contact/${id}`,
      { status: 'read' },
      ownerToken,
    );
    expect(patched.json().status).toBe('read');
    expect(patched.json().handledByUserId).toBeTruthy();
  });

  it('rejects invalid payloads', async () => {
    const res = await inject('POST', '/api/v1/contact', {
      name: '',
      email: 'not-an-email',
      message: '',
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires contact:read for the admin inbox', async () => {
    const res = await inject('GET', '/api/v1/admin/contact');
    expect(res.statusCode).toBe(401);
  });
});
