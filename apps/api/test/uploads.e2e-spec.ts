import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb } from './setup-e2e';

describe('uploads (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
    ownerToken = await ensureOwnerToken(app);
  });

  async function inject(body: unknown, token?: string) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/uploads/presign',
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('returns a presigned URL for a valid request', async () => {
    const res = await inject(
      {
        kind: 'menu-item-image',
        mimeType: 'image/jpeg',
        sizeBytes: 204_800,
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uploadUrl).toBeTypeOf('string');
    expect(body.publicUrl).toBeTypeOf('string');
    expect(body.key).toBeTypeOf('string');
    expect(body.expiresIn).toBe(300);
  });

  it('rejects unsupported mime types', async () => {
    const res = await inject(
      {
        kind: 'menu-item-image',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects oversized payloads', async () => {
    const res = await inject(
      {
        kind: 'menu-item-image',
        mimeType: 'image/jpeg',
        sizeBytes: 6 * 1024 * 1024,
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await inject({
      kind: 'menu-item-image',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
    });
    expect(res.statusCode).toBe(401);
  });
});
