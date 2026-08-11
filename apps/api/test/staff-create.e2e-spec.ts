import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { verifyPassword } from '@repo/auth-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb } from './setup-e2e';

describe('owner-created staff accounts (e2e)', () => {
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
    const prisma = app.get(PrismaService);
    for (const [key, name] of [
      ['manager', 'Manager'],
      ['kitchen', 'Kitchen'],
      ['cashier', 'Cashier'],
    ] as const) {
      await prisma.role.upsert({ where: { key }, update: { name }, create: { key, name } });
    }
  });

  const payload = {
    firstName: 'Maya',
    lastName: 'Manager',
    email: 'manager.e2e@test.local',
    phone: '+48 600 123 456',
    password: 'Temporary123',
    roleKey: 'manager',
  } as const;

  it('lets an owner create an immediately active staff account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/staff',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      roleKeys: ['manager'],
      isActive: true,
    });

    const user = await app.get(PrismaService).user.findUnique({
      where: { email: payload.email },
      include: { roles: { include: { role: true } } },
    });
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user?.passwordHash).toBeTruthy();
    expect(await verifyPassword(payload.password, user?.passwordHash ?? '')).toBe(true);
    expect(user?.roles.map(({ role }) => role.key)).toEqual(['manager']);
  });

  it('rejects duplicate account identities', async () => {
    const request = () =>
      app.inject({
        method: 'POST',
        url: '/api/v1/admin/staff',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload,
      });

    expect((await request()).statusCode).toBe(201);
    expect((await request()).statusCode).toBe(400);
  });

  it('rejects non-owner callers and creation of another owner', async () => {
    const customer = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'customer.e2e@test.local', password: 'Password123!' },
    });
    const customerToken = customer.json().accessToken as string;
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/staff',
      headers: { authorization: `Bearer ${customerToken}` },
      payload,
    });
    expect(forbidden.statusCode).toBe(403);

    const invalidRole = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/staff',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { ...payload, roleKey: 'owner' },
    });
    expect(invalidRole.statusCode).toBe(400);
  });
});
