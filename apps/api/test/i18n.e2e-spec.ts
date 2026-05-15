import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './setup-e2e';

describe('i18n (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function get(url: string, headers?: Record<string, string>) {
    return app.inject({ method: 'GET', url, headers });
  }

  it('serves the english catalog by default (public, no auth)', async () => {
    const res = await get('/api/v1/i18n/messages');
    expect(res.statusCode).toBe(200);
    expect(res.json().locale).toBe('en');
    expect(res.json().dir).toBe('ltr');
    expect(res.json().messages.common.appName).toBe('Restaurant');
  });

  it('honours the explicit locale query', async () => {
    const res = await get('/api/v1/i18n/messages?locale=ar');
    expect(res.json().locale).toBe('ar');
    expect(res.json().dir).toBe('rtl');
    expect(res.json().messages.common.appName).toBe('المطعم');
  });

  it('negotiates from Accept-Language when no query is given', async () => {
    const res = await get('/api/v1/i18n/messages', {
      'accept-language': 'ar;q=0.9, en;q=0.1',
    });
    expect(res.json().locale).toBe('ar');
  });
});
