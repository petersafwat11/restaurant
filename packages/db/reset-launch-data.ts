import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EXECUTE_FLAG = '--execute';
const CONFIRMATION = 'DELETE_ALL_OPERATIONAL_DATA';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function operationalCounts() {
  return {
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    carts: await prisma.cart.count(),
    reviews: await prisma.review.count(),
    reservations: await prisma.reservation.count(),
    notifications: await prisma.notification.count(),
    staffInvites: await prisma.staffInvite.count(),
    contacts: await prisma.contactMessage.count(),
    newsletterSubscribers: await prisma.newsletterSubscriber.count(),
    auditLogs: await prisma.auditLog.count(),
    dailyMetrics: await prisma.dailyMetric.count(),
    promotions: await prisma.promotion.count(),
  };
}

async function main() {
  const before = await operationalCounts();
  console.log(
    JSON.stringify({ mode: process.argv.includes(EXECUTE_FLAG) ? 'execute' : 'dry-run', before }),
  );

  if (!process.argv.includes(EXECUTE_FLAG)) return;
  if (requiredEnv('LAUNCH_RESET_CONFIRM') !== CONFIRMATION) {
    throw new Error(`LAUNCH_RESET_CONFIRM must equal ${CONFIRMATION}`);
  }

  const owner = {
    firstName: requiredEnv('OWNER_FIRST_NAME'),
    lastName: requiredEnv('OWNER_LAST_NAME'),
    email: requiredEnv('OWNER_EMAIL').toLowerCase(),
    phone: requiredEnv('OWNER_PHONE'),
    password: requiredEnv('OWNER_PASSWORD'),
  };
  if (!/^\S+@\S+\.\S+$/.test(owner.email)) throw new Error('OWNER_EMAIL is invalid');
  if (!/^\+?[0-9\s().-]{7,20}$/.test(owner.phone)) throw new Error('OWNER_PHONE is invalid');
  if (owner.password.length < 12)
    throw new Error('OWNER_PASSWORD must contain at least 12 characters');

  const passwordHash = await bcrypt.hash(owner.password, 12);

  const ownerId = await prisma.$transaction(
    async (tx) => {
      await tx.reviewImage.deleteMany();
      await tx.review.deleteMany();
      await tx.refund.deleteMany();
      await tx.payment.deleteMany();
      await tx.orderStatusEvent.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.cartItem.deleteMany();
      await tx.cart.deleteMany();
      await tx.reservation.deleteMany();
      await tx.loyaltyTransaction.deleteMany();
      await tx.loyaltyAccount.deleteMany();
      await tx.referral.deleteMany();
      await tx.referralCode.deleteMany();
      await tx.couponRedemption.deleteMany();
      await tx.userTag.deleteMany();
      await tx.customerTag.deleteMany();
      await tx.customerNote.deleteMany();
      await tx.contactNote.deleteMany();
      await tx.contactMessage.deleteMany();
      await tx.staffInvite.deleteMany();
      await tx.notification.deleteMany();
      await tx.notificationPreference.deleteMany();
      await tx.webPushSubscription.deleteMany();
      await tx.pushToken.deleteMany();
      await tx.refreshToken.deleteMany();
      await tx.paymentMethod.deleteMany();
      await tx.userAddress.deleteMany();
      await tx.userRole.deleteMany();
      await tx.user.deleteMany();
      await tx.newsletterSubscriber.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.dailyMetric.deleteMany();
      await tx.webhookEvent.deleteMany();
      await tx.promotion.deleteMany();

      const ownerRole = await tx.role.findUniqueOrThrow({ where: { key: 'owner' } });
      const created = await tx.user.create({
        data: {
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phone: owner.phone,
          passwordHash,
          emailVerifiedAt: new Date(),
          isActive: true,
          roles: { create: { roleId: ownerRole.id } },
        },
      });
      return created.id;
    },
    { maxWait: 15_000, timeout: 120_000 },
  );

  const [after, ownerAccount, preserved] = await Promise.all([
    operationalCounts(),
    prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        email: true,
        phone: true,
        isActive: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    }),
    Promise.all([
      prisma.restaurant.count(),
      prisma.operatingHours.count(),
      prisma.menuCategory.count(),
      prisma.menuItem.count(),
      prisma.menuItemModifierGroup.count(),
      prisma.menuItemModifierOption.count(),
      prisma.table.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.featureFlag.count(),
    ]),
  ]);

  const roles = ownerAccount?.roles.map(({ role }) => role.key) ?? [];
  if (after.users !== 1 || !ownerAccount?.isActive || roles.length !== 1 || roles[0] !== 'owner') {
    throw new Error('Launch reset verification failed: expected exactly one active owner');
  }
  const residual = Object.entries(after).filter(([key, count]) => key !== 'users' && count !== 0);
  if (residual.length > 0) {
    throw new Error(
      `Launch reset verification failed: residual operational data ${JSON.stringify(residual)}`,
    );
  }

  console.log(
    JSON.stringify({
      result: 'ok',
      after,
      owner: { id: ownerAccount.id, email: ownerAccount.email, phone: ownerAccount.phone, roles },
      preserved: {
        restaurants: preserved[0],
        operatingHours: preserved[1],
        menuCategories: preserved[2],
        menuItems: preserved[3],
        modifierGroups: preserved[4],
        modifierOptions: preserved[5],
        tables: preserved[6],
        roles: preserved[7],
        permissions: preserved[8],
        featureFlags: preserved[9],
      },
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
