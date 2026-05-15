import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const STRIPE_WEBHOOK_PATH = '/api/v1/payments/webhooks/stripe';

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const adapter = new FastifyAdapter();
  const instance = adapter.getInstance();
  instance.removeContentTypeParser('application/json');
  instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      if (req.url?.startsWith(STRIPE_WEBHOOK_PATH)) {
        (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      }
      const buf = body as Buffer;
      const json = buf.length === 0 ? {} : JSON.parse(buf.toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error);
    }
  });

  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter, {
    bodyParser: false,
  });
  app.setGlobalPrefix('api/v1');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function resetDb(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.refreshToken.deleteMany();
  await prisma.userAddress.deleteMany();
  await prisma.userRole.deleteMany({
    where: { user: { email: { contains: '.e2e@', mode: 'insensitive' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: '.e2e@', mode: 'insensitive' } },
  });
}

/**
 * Sprint 2/3: wipe restaurant + menu + cart + order + promotion tables so each
 * test starts clean. `onDelete: Cascade` covers child rows; we nuke parents.
 */
export async function resetMenuDb(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.webhookEvent.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderStatusEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();
  await prisma.menuItemModifierOption.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.menuItemImage.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.operatingHours.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.staffInvite.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.dailyMetric.deleteMany();
  await prisma.export.deleteMany();
  await prisma.auditLog.deleteMany();
}

const ALL_PERMISSIONS = [
  'order:read',
  'order:create',
  'order:update',
  'order:status_update',
  'order:cancel',
  'order:refund',
  'menu:read',
  'menu:write',
  'restaurant:read',
  'restaurant:write',
  'customer:read',
  'customer:write',
  'customer:notes',
  'promotion:read',
  'promotion:write',
  'reservation:read',
  'reservation:write',
  'review:read',
  'review:moderate',
  'staff:read',
  'staff:write',
  'reports:read',
  'settings:read',
  'settings:write',
  'payment:create',
  'payment:read',
  'payment:refund',
  'kitchen:read',
  'analytics:read',
  'report:read',
  'report:export',
  'audit:read',
];

/**
 * Ensure permissions + owner/customer roles exist, register a fresh user via
 * /auth/register, then promote them to the owner role. Returns the bearer
 * token from the registration response.
 */
export async function ensureOwnerToken(
  app: NestFastifyApplication,
  email = 'owner.e2e@test.local',
): Promise<string> {
  const prisma = app.get(PrismaService);

  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  const ownerRole = await prisma.role.upsert({
    where: { key: 'owner' },
    update: { name: 'Owner' },
    create: { key: 'owner', name: 'Owner' },
  });

  // auth/register hits findUniqueOrThrow for the customer role; ensure it
  // exists so tests can register fresh non-admin users.
  await prisma.role.upsert({
    where: { key: 'customer' },
    update: { name: 'Customer' },
    create: { key: 'customer', name: 'Customer' },
  });

  const perms = await prisma.permission.findMany({
    where: { key: { in: ALL_PERMISSIONS } },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: ownerRole.id } });
  await prisma.rolePermission.createMany({
    data: perms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  const reg = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'Password123!' },
  });
  const { accessToken } = reg.json() as {
    accessToken: string;
    user: { id: string };
  };
  const userId = reg.json().user.id as string;

  // Promote the freshly-registered customer to owner.
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: ownerRole.id } },
    update: {},
    create: { userId, roleId: ownerRole.id },
  });

  // Re-login so the new token carries the owner role + permissions.
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: 'Password123!' },
  });
  return login.json().accessToken as string;
}
