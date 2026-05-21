import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDb } from './setup-e2e';

describe('addresses (e2e)', () => {
  let app: NestFastifyApplication;
  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    aliceToken = await register('alice.e2e@test.local');
    bobToken = await register('bob.e2e@test.local');
  });

  async function inject(method: string, url: string, body?: unknown, token?: string) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      url,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  async function register(email: string): Promise<string> {
    const res = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    return res.json().accessToken;
  }

  function sampleAddress() {
    return {
      line1: '1 Test St',
      city: 'Test City',
      country: 'US',
      geoPoint: { lat: 52.2297, lng: 21.0122 },
    };
  }

  it('creates and lists own addresses', async () => {
    const c = await inject('POST', '/api/v1/addresses', sampleAddress(), aliceToken);
    expect(c.statusCode).toBe(201);

    const l = await inject('GET', '/api/v1/addresses', undefined, aliceToken);
    expect(l.statusCode).toBe(200);
    expect(l.json()).toHaveLength(1);
    expect(l.json()[0].isDefault).toBe(true); // first address auto-default
  });

  it("forbids reading/updating another user's address", async () => {
    const c = await inject('POST', '/api/v1/addresses', sampleAddress(), aliceToken);
    const id = c.json().id;

    const u = await inject('PATCH', `/api/v1/addresses/${id}`, { label: 'hacked' }, bobToken);
    expect(u.statusCode).toBe(404);

    const d = await inject('DELETE', `/api/v1/addresses/${id}`, undefined, bobToken);
    expect(d.statusCode).toBe(404);
  });

  it('setDefault unsets the previous default atomically', async () => {
    const a = (await inject('POST', '/api/v1/addresses', sampleAddress(), aliceToken)).json();
    const b = (
      await inject(
        'POST',
        '/api/v1/addresses',
        { ...sampleAddress(), line1: '2 Test St' },
        aliceToken,
      )
    ).json();

    expect(a.isDefault).toBe(true);
    expect(b.isDefault).toBe(false);

    const sd = await inject('POST', `/api/v1/addresses/${b.id}/default`, undefined, aliceToken);
    expect(sd.statusCode).toBe(200);

    const list = (await inject('GET', '/api/v1/addresses', undefined, aliceToken)).json();
    const byId = Object.fromEntries(
      list.map((row: { id: string; isDefault: boolean }) => [row.id, row.isDefault]),
    );
    expect(byId[a.id]).toBe(false);
    expect(byId[b.id]).toBe(true);
  });

});
