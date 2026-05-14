import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDb } from './setup-e2e';

describe('auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('registers a new user and returns tokens', async () => {
    const res = await inject('POST', '/api/v1/auth/register', {
      email: 'new.e2e@test.local',
      password: 'Password123!',
      firstName: 'New',
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');
    expect(body.user.email).toBe('new.e2e@test.local');
    expect(body.user.roles).toContain('customer');
  });

  it('rejects duplicate registration', async () => {
    const body = { email: 'dup.e2e@test.local', password: 'Password123!' };
    await inject('POST', '/api/v1/auth/register', body);
    const res = await inject('POST', '/api/v1/auth/register', body);
    expect(res.statusCode).toBe(409);
  });

  it('logs in with correct password', async () => {
    await inject('POST', '/api/v1/auth/register', {
      email: 'login.e2e@test.local',
      password: 'Password123!',
    });
    const res = await inject('POST', '/api/v1/auth/login', {
      email: 'login.e2e@test.local',
      password: 'Password123!',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTypeOf('string');
  });

  it('rejects login with wrong password', async () => {
    await inject('POST', '/api/v1/auth/register', {
      email: 'wrong.e2e@test.local',
      password: 'Password123!',
    });
    const res = await inject('POST', '/api/v1/auth/login', {
      email: 'wrong.e2e@test.local',
      password: 'WrongPassword1!',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns me with permissions', async () => {
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'me.e2e@test.local',
      password: 'Password123!',
    });
    const { accessToken } = reg.json();
    const me = await inject('GET', '/api/v1/auth/me', undefined, accessToken);
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe('me.e2e@test.local');
    expect(Array.isArray(me.json().permissions)).toBe(true);
  });

  it('rejects /auth/me without token', async () => {
    const res = await inject('GET', '/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('refreshes tokens and rejects reuse of old token', async () => {
    const reg = await inject('POST', '/api/v1/auth/register', {
      email: 'refresh.e2e@test.local',
      password: 'Password123!',
    });
    const first = reg.json();

    const r1 = await inject('POST', '/api/v1/auth/refresh', {
      refreshToken: first.refreshToken,
    });
    expect(r1.statusCode).toBe(200);

    // Old refresh token should now be revoked
    const r2 = await inject('POST', '/api/v1/auth/refresh', {
      refreshToken: first.refreshToken,
    });
    expect(r2.statusCode).toBe(401);
  });
});
