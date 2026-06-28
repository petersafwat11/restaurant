import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccountDeletionService } from '../src/account-deletion/account-deletion.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb } from './setup-e2e';

/**
 * Account deletion / anonymisation (plan §G2). Happy path uses the PASSWORD
 * reauth route — deterministic and needs no email delivery. The grace-period
 * anonymisation job itself is covered by the pure unit test
 * (apps/api/src/account-deletion/__tests__/pseudonymise.spec.ts); here we assert
 * the request → PENDING + scheduled, and cancel → CANCELLED transitions.
 */
describe('account-deletion (e2e)', () => {
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

  async function registerUser(email: string): Promise<string> {
    const reg = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    expect(reg.statusCode).toBe(201);
    return reg.json().accessToken as string;
  }

  it('requires a session', async () => {
    const res = await inject('GET', '/api/v1/account/deletion');
    expect(res.statusCode).toBe(401);
  });

  it('reports NONE before any request', async () => {
    const token = await registerUser('del.none.e2e@test.local');
    const res = await inject('GET', '/api/v1/account/deletion', undefined, token);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('NONE');
    expect(body.scheduledAt).toBeNull();
    expect(body.anonymisedAt).toBeNull();
    expect(body.graceDays).toBeGreaterThan(0);
  });

  it('schedules deletion after password reauth, then cancels', async () => {
    const token = await registerUser('del.flow.e2e@test.local');

    // Request with the correct password → PENDING + scheduled.
    const req = await inject(
      'POST',
      '/api/v1/account/deletion/request',
      { method: 'password', currentPassword: 'Password123!', reason: 'no longer needed' },
      token,
    );
    expect(req.statusCode).toBe(200);
    const reqBody = req.json();
    expect(reqBody.status).toBe('PENDING');
    expect(reqBody.requestedAt).toBeTypeOf('string');
    expect(reqBody.scheduledAt).toBeTypeOf('string');
    // Scheduled in the future (grace period).
    expect(new Date(reqBody.scheduledAt).getTime()).toBeGreaterThan(Date.now());

    // Status reflects PENDING.
    const status = await inject('GET', '/api/v1/account/deletion', undefined, token);
    expect(status.json().status).toBe('PENDING');

    // Cancel → CANCELLED, schedule cleared.
    const cancel = await inject('POST', '/api/v1/account/deletion/cancel', undefined, token);
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().status).toBe('CANCELLED');
    expect(cancel.json().scheduledAt).toBeNull();
  });

  it('rejects a request with the wrong password', async () => {
    const token = await registerUser('del.wrongpw.e2e@test.local');
    const res = await inject(
      'POST',
      '/api/v1/account/deletion/request',
      { method: 'password', currentPassword: 'WrongPassword1!' },
      token,
    );
    expect(res.statusCode).toBe(401);

    // Still NONE — a failed reauth must not schedule anything.
    const status = await inject('GET', '/api/v1/account/deletion', undefined, token);
    expect(status.json().status).toBe('NONE');
  });

  it('rejects an invalid confirmation token', async () => {
    const token = await registerUser('del.badtoken.e2e@test.local');
    const res = await inject(
      'POST',
      '/api/v1/account/deletion/confirm',
      { token: 'not-a-real-token' },
      token,
    );
    expect(res.statusCode).toBe(400);
  });

  it('anonymises the account + deletes PII child rows when the job runs', async () => {
    const email = 'del.anon.e2e@test.local';
    const accessToken = await registerUser(email);
    const prisma = app.get(PrismaService);
    const service = app.get(AccountDeletionService);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Give the user PII child rows that the job must remove.
    await prisma.userAddress.create({
      data: {
        userId: user.id,
        line1: 'ul. Test 1',
        city: 'Kielce',
        country: 'PL',
      },
    });
    await prisma.notification.create({
      data: { userId: user.id, type: 'system', title: 'Hi Jan', body: 'ul. Secret 5' },
    });

    // Schedule, then force the grace period into the past so the job is due.
    await inject(
      'POST',
      '/api/v1/account/deletion/request',
      { method: 'password', currentPassword: 'Password123!' },
      accessToken,
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { deletionScheduledAt: new Date(Date.now() - 1000) },
    });

    // Run the anonymisation directly (bypasses the 7-day BullMQ delay).
    const result = await service.anonymise(user.id);
    expect(result.anonymised).toBe(true);

    // User row is pseudonymised, not deleted.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.email).toBe(`deleted-${user.id}@deleted.invalid`);
    expect(after.firstName).toBeNull();
    expect(after.phone).toBeNull();
    expect(after.passwordHash).toBeNull();
    expect(after.isActive).toBe(false);
    expect(after.deletionStatus).toBe('COMPLETED');
    expect(after.anonymisedAt).not.toBeNull();

    // PII child rows are gone.
    expect(await prisma.userAddress.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);

    // Running again is a safe no-op (already COMPLETED).
    expect((await service.anonymise(user.id)).anonymised).toBe(false);

    // Clean up the anonymised row (its email no longer matches the .e2e@ filter).
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
