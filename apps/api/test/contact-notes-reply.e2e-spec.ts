import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

describe('contact notes + reply (e2e)', () => {
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

  async function makeMessage() {
    const res = await inject('POST', '/api/v1/contact', {
      name: 'Janek',
      email: 'janek@example.com',
      subject: 'Catering inquiry',
      message: 'Do you cater weddings?',
    });
    return res.json().id as string;
  }

  it('adds an internal note and lists it', async () => {
    const id = await makeMessage();

    const note = await inject(
      'POST',
      `/api/v1/admin/contact/${id}/notes`,
      { body: 'Following up by phone' },
      ownerToken,
    );
    expect(note.statusCode).toBe(201);
    expect(note.json().kind).toBe('NOTE');
    expect(note.json().body).toBe('Following up by phone');

    const list = await inject(
      'GET',
      `/api/v1/admin/contact/${id}/notes`,
      undefined,
      ownerToken,
    );
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].kind).toBe('NOTE');
  });

  it('sends a reply, records it as a REPLY note, and marks the message as read', async () => {
    const id = await makeMessage();

    const reply = await inject(
      'POST',
      `/api/v1/admin/contact/${id}/reply`,
      { body: 'Yes, we do! Let me send details.', subject: 'Re: Catering' },
      ownerToken,
    );
    expect(reply.statusCode).toBe(201);
    expect(reply.json().kind).toBe('REPLY');

    const list = await inject(
      'GET',
      `/api/v1/admin/contact/${id}/notes`,
      undefined,
      ownerToken,
    );
    expect(list.json().some((n: { kind: string }) => n.kind === 'REPLY')).toBe(true);

    // The message status auto-advances from 'new' to 'read' after the first reply.
    const messages = await inject(
      'GET',
      '/api/v1/admin/contact',
      undefined,
      ownerToken,
    );
    const msg = messages.json().items.find((m: { id: string }) => m.id === id);
    expect(msg.status).toBe('read');
    expect(msg.handledByUserId).toBeTruthy();
  });

  it('rejects an empty reply body', async () => {
    const id = await makeMessage();
    const res = await inject(
      'POST',
      `/api/v1/admin/contact/${id}/reply`,
      { body: '' },
      ownerToken,
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the message does not exist', async () => {
    const res = await inject(
      'POST',
      '/api/v1/admin/contact/does-not-exist/notes',
      { body: 'note' },
      ownerToken,
    );
    expect(res.statusCode).toBe(404);
  });
});
