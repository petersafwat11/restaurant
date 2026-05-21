import { Buffer } from 'node:buffer';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import FormData from 'form-data';
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

  async function postForm(form: FormData, token?: string) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      payload: form.getBuffer(),
      headers: {
        ...form.getHeaders(),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  function pngBytes(): Buffer {
    // 1x1 transparent PNG
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
      'base64',
    );
  }

  it('stores a valid upload and returns publicUrl + key', async () => {
    const form = new FormData();
    form.append('kind', 'menu-item-image');
    form.append('file', pngBytes(), { filename: 'tiny.png', contentType: 'image/png' });

    const res = await postForm(form, ownerToken);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.key).toMatch(/^menu-items\/[0-9a-f-]+\.png$/);
    expect(body.publicUrl).toContain('/uploads/');
    expect(body.publicUrl).toContain(body.key);

    // file actually lives on disk
    const uploadsDir = process.env.UPLOADS_DIR
      ? join(process.cwd(), process.env.UPLOADS_DIR)
      : join(process.cwd(), 'uploads');
    const exists = await fs
      .stat(join(uploadsDir, body.key))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('rejects unsupported mime types', async () => {
    const form = new FormData();
    form.append('kind', 'menu-item-image');
    form.append('file', Buffer.from('%PDF-1.4 …'), {
      filename: 'doc.pdf',
      contentType: 'application/pdf',
    });
    const res = await postForm(form, ownerToken);
    expect(res.statusCode).toBe(400);
  });

  it('rejects oversized payloads', async () => {
    const form = new FormData();
    form.append('kind', 'menu-item-image');
    form.append('file', Buffer.alloc(6 * 1024 * 1024, 0), {
      filename: 'big.jpg',
      contentType: 'image/jpeg',
    });
    const res = await postForm(form, ownerToken);
    expect([400, 413]).toContain(res.statusCode);
  });

  it('requires authentication', async () => {
    const form = new FormData();
    form.append('kind', 'menu-item-image');
    form.append('file', pngBytes(), { filename: 'tiny.png', contentType: 'image/png' });
    const res = await postForm(form);
    expect(res.statusCode).toBe(401);
  });
});
