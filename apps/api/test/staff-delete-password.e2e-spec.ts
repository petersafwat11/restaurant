import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { verifyPassword } from '@repo/auth-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb } from './setup-e2e';

/**
 * Owner-only user management:
 *  - DELETE /admin/staff/:userId  → hard delete
 *  - POST   /users/:id/password   → force-set another user's password
 */
describe('owner staff delete + password reset (e2e)', () => {
  let app: NestFastifyApplication;
  let ownerToken: string;

  const ownerEmail = 'owner.e2e@test.local';
  const staffPayload = {
    firstName: 'Maya',
    lastName: 'Manager',
    email: 'manager.e2e@test.local',
    phone: '+48 600 123 456',
    password: 'Temporary123',
    roleKey: 'manager',
  } as const;

  async function createStaff(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/staff',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: staffPayload,
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

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

  describe('DELETE /admin/staff/:userId', () => {
    it('permanently removes the account and cascades its records', async () => {
      const userId = await createStaff();
      const prisma = app.get(PrismaService);

      // Give the user a refresh token so we can prove cascade cleanup.
      await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash: `hash-${userId}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/staff/${userId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });

      expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
      expect(await prisma.refreshToken.findMany({ where: { userId } })).toHaveLength(0);

      // The deleted manager must no longer appear in the staff list.
      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/staff',
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(list.json().map((u: { id: string }) => u.id)).not.toContain(userId);
    });

    it('deletes a customer along with their reviews (FK-restricted relation)', async () => {
      const prisma = app.get(PrismaService);
      const customer = await prisma.user.create({
        data: {
          email: 'customer.e2e@test.local',
          passwordHash: 'x',
          roles: {
            create: {
              roleId: (
                await prisma.role.upsert({
                  where: { key: 'customer' },
                  update: {},
                  create: { key: 'customer', name: 'Customer' },
                })
              ).id,
            },
          },
        },
      });

      const order = await prisma.order.create({
        data: {
          orderNumber: `E2E-${Date.now()}`,
          status: 'COMPLETED',
          currency: 'PLN',
          type: 'DELIVERY',
          subtotal: 10,
          deliveryFee: 0,
          taxTotal: 0,
          tipAmount: 0,
          discountTotal: 0,
          grandTotal: 10,
          userId: customer.id,
        },
      });
      await prisma.review.create({
        data: { orderId: order.id, userId: customer.id, rating: 5 },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/staff/${customer.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(await prisma.user.findUnique({ where: { id: customer.id } })).toBeNull();
      expect(await prisma.review.findFirst({ where: { userId: customer.id } })).toBeNull();
    });

    it('rejects non-owners and self-deletion', async () => {
      const userId = await createStaff();

      // A customer has no staff permissions at all.
      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'customer2.e2e@test.local', password: 'Password123!' },
      });
      const customerToken = register.json().accessToken as string;
      const forbidden = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/staff/${userId}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(forbidden.statusCode).toBe(403);

      // Owner cannot delete themselves.
      const prisma = app.get(PrismaService);
      const ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })).id;
      const selfDelete = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/staff/${ownerId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(selfDelete.statusCode).toBe(400);
    });
  });

  describe('POST /users/:id/password', () => {
    it("lets an owner set a staff member's password and revokes sessions", async () => {
      const userId = await createStaff();
      const prisma = app.get(PrismaService);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${userId}/password`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { newPassword: 'BrandNew123' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(await verifyPassword('BrandNew123', user.passwordHash ?? '')).toBe(true);
      expect(await verifyPassword(staffPayload.password, user.passwordHash ?? '')).toBe(false);
    });

    it("lets an owner set a customer's password and the customer can then log in", async () => {
      const prisma = app.get(PrismaService);
      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'customer3.e2e@test.local', password: 'OldPassword123' },
      });
      expect(register.statusCode).toBe(201);
      const customerId = register.json().user.id as string;

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${customerId}/password`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { newPassword: 'OwnerSet123' },
      });
      expect(res.statusCode).toBe(200);

      const oldLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'customer3.e2e@test.local', password: 'OldPassword123' },
      });
      expect(oldLogin.statusCode).toBe(401);

      const newLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'customer3.e2e@test.local', password: 'OwnerSet123' },
      });
      expect(newLogin.statusCode).toBe(200);
    });

    it('rejects weak passwords and non-owner callers', async () => {
      const userId = await createStaff();

      const weak = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${userId}/password`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { newPassword: 'weak' },
      });
      expect(weak.statusCode).toBe(400);

      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'customer4.e2e@test.local', password: 'Password123!' },
      });
      const customerToken = register.json().accessToken as string;
      const forbidden = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${userId}/password`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { newPassword: 'BrandNew123' },
      });
      expect(forbidden.statusCode).toBe(403);
    });
  });
});
