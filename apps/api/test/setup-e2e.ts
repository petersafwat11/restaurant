import fastifyMultipart from '@fastify/multipart';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { LEGAL_BUNDLE_VERSION, MAX_UPLOAD_BYTES } from '@repo/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

const ESERVICE_WEBHOOK_PATH = '/api/v1/payments/webhooks/eservice';
const ESERVICE_RETURN_PATH = '/api/v1/payments/eservice/return';

function needsEserviceRawBody(url: string | undefined): boolean {
  return !!url && (url.startsWith(ESERVICE_WEBHOOK_PATH) || url.startsWith(ESERVICE_RETURN_PATH));
}

/**
 * Legal-acceptance fields every POST /orders payload must now carry (plan §C2).
 * Spread into an order body: `{ type, tipAmount, ...orderLegal() }`. Pass
 * `{ guest: true }` to also include the contact snapshot required for guest
 * checkout (no User row to fall back to).
 */
export function orderLegal(opts: { guest?: boolean } = {}) {
  return {
    legalAccepted: true as const,
    legalBundleVersion: LEGAL_BUNDLE_VERSION,
    ...(opts.guest
      ? { contact: { name: 'Guest E2E', email: 'guest.e2e@test.local', phone: '+48555000222' } }
      : {}),
  };
}

export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const adapter = new FastifyAdapter();
  const instance = adapter.getInstance();
  instance.removeContentTypeParser('application/json');
  instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      if (needsEserviceRawBody(req.url)) {
        (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      }
      const buf = body as Buffer;
      const json = buf.length === 0 ? {} : JSON.parse(buf.toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error);
    }
  });
  instance.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const buf = body as Buffer;
        if (needsEserviceRawBody(req.url)) {
          (req as unknown as { rawBody: Buffer }).rawBody = buf;
        }
        const parsed: Record<string, string> = {};
        for (const [key, value] of new URLSearchParams(buf.toString('utf8'))) parsed[key] = value;
        done(null, parsed);
      } catch (err) {
        done(err as Error);
      }
    },
  );

  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter, {
    bodyParser: false,
  });
  // Mirror main.ts: register multipart so POST /uploads (multipart/form-data)
  // works the same in e2e tests as in prod. Without this, fastify rejects
  // multipart bodies as "Unsupported Media Type" and the upload endpoint 500s.
  await app.register(fastifyMultipart as Parameters<typeof app.register>[0], {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
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

  // POST /orders idempotency keys live in Redis (24h TTL), not Postgres, so the
  // resets above don't clear them. Order/payment e2e tests that reuse a stable
  // guest `sessionKey` would otherwise collide with a previous run's key: the
  // replay path returns the prior orderId, which no longer exists in the
  // freshly-reset Postgres → 404. Flush them so the suites are repeatable
  // against a persistent (dev) Redis. CI uses a fresh Redis, so this is a no-op
  // there. Pattern matches IdempotencyService.key() (`idempotency:order:<hash>`).
  const redis = app.get(RedisService);
  const keys = await redis.client.keys('idempotency:order:*');
  if (keys.length > 0) await redis.client.del(...keys);

  // Rate-limit counters (plan §I1) are also Redis-backed and IP-keyed, so the
  // shared test IP would carry counts across runs/tests against a persistent
  // dev Redis. Flush them so throttle suites are repeatable. No-op on CI's
  // fresh Redis. Pattern matches RateLimitGuard's `rl:<name>:<fingerprint>`.
  const rlKeys = await redis.client.keys('rl:*');
  if (rlKeys.length > 0) await redis.client.del(...rlKeys);
}

/**
 * Ensure the single Restaurant row exists for tests. Upserts by slug so it's
 * safe to call after `resetMenuDb` (which nukes the table). Returns nothing —
 * single-restaurant means no id is needed at the call site.
 */
export async function ensureRestaurant(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.restaurant.upsert({
    where: { slug: 'e2e-restaurant' },
    update: {},
    create: {
      slug: 'e2e-restaurant',
      name: 'E2E Restaurant',
      phone: '+48 22 555 0000',
      email: 'e2e@test.local',
      // Match production (Polish restaurant) so the payment config + order
      // currency are PLN, consistent with the rest of the e2e suite.
      currency: 'PLN',
      address: { line1: 'ul. Test 1', city: 'Warsaw', country: 'PL' },
    },
  });
}

/**
 * Sprint 2/3: wipe restaurant + menu + cart + order + promotion tables so each
 * test starts clean. `onDelete: Cascade` covers child rows; we nuke parents.
 */
export async function resetMenuDb(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.webhookEvent.deleteMany();
  // Sprint 11 — loyalty / referral (user-scoped; explicit so a menu-only
  // reset between tests doesn't leak ledger rows).
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.couponRedemption.deleteMany();
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
  await prisma.auditLog.deleteMany();
  await prisma.contactNote.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.userTag.deleteMany();
  await prisma.customerTag.deleteMany();
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
  'customer:tag',
  'customer:email',
  'promotion:read',
  'promotion:write',
  'promotion:archive',
  'reservation:read',
  'reservation:write',
  'review:read',
  'review:moderate',
  'staff:read',
  'staff:write',
  'settings:read',
  'settings:write',
  'payment:create',
  'payment:read',
  'payment:refund',
  'kitchen:read',
  'analytics:read',
  'audit:read',
  'contact:read',
  'contact:reply',
  'contact:notes',
  'flags:write',
  'user:set_password',
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
