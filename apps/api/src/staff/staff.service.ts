import { randomBytes, createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { hashPassword } from '@repo/auth-core';
import type {
  AcceptStaffInviteDto,
  InviteStaffDto,
  StaffListQuery,
  StaffMemberDto,
  StaffRoleKey,
  UpdateStaffRoleDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  userId: string;
  roleKeys: string[];
}

const ROLE_HIERARCHY: Record<StaffRoleKey, StaffRoleKey[]> = {
  owner: ['owner', 'manager', 'kitchen', 'cashier'],
  manager: ['kitchen', 'cashier'],
  kitchen: [],
  cashier: [],
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StaffListQuery): Promise<StaffMemberDto[]> {
    const where: Prisma.UserWhereInput = {
      roles: {
        some: {
          role: { key: { in: ['owner', 'manager', 'kitchen', 'cashier'] } },
        },
      },
      ...(query.roleKey ? { roles: { some: { role: { key: query.roleKey } } } } : {}),
    };
    const users = await this.prisma.user.findMany({
      where,
      include: { roles: { include: { role: { select: { key: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      roleKeys: u.roles.map((r) => r.role.key),
      isActive: u.isActive,
      emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async invite(actor: Actor, dto: InviteStaffDto): Promise<{ token: string; expiresAt: string }> {
    this.assertCanManage(actor, dto.roleKey);

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('A user with that email already exists');

    const token = randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);

    await this.prisma.staffInvite.create({
      data: {
        email: dto.email,
        roleKey: dto.roleKey,
        restaurantId: dto.restaurantId ?? null,
        tokenHash,
        invitedByUserId: actor.userId,
        expiresAt,
      },
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvite(dto: AcceptStaffInviteDto): Promise<{ userId: string }> {
    const tokenHash = sha256(dto.token);
    const invite = await this.prisma.staffInvite.findUnique({ where: { tokenHash } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new BadRequestException('Invite already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite expired');

    const role = await this.prisma.role.findUnique({ where: { key: invite.roleKey } });
    if (!role) throw new BadRequestException(`Role ${invite.roleKey} not configured`);

    const existing = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) throw new BadRequestException('User with this email already exists');

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: invite.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
      await tx.staffInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return u;
    });

    return { userId: user.id };
  }

  async updateRole(actor: Actor, userId: string, dto: UpdateStaffRoleDto): Promise<StaffMemberDto> {
    this.assertCanManage(actor, dto.roleKey);

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { select: { key: true } } } } },
    });
    if (!target) throw new NotFoundException('User not found');

    // Manager can't manage other managers/owners.
    const targetKey = target.roles.map((r) => r.role.key);
    if (
      !actor.roleKeys.includes('owner') &&
      (targetKey.includes('owner') || targetKey.includes('manager'))
    ) {
      throw new ForbiddenException('Cannot manage this user');
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: dto.roleKey } });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: { userId, role: { key: { in: ['owner', 'manager', 'kitchen', 'cashier'] } } },
      }),
      this.prisma.userRole.create({ data: { userId, roleId: role.id } }),
    ]);

    return (await this.list({ roleKey: dto.roleKey })).find((u) => u.id === userId) ?? {
      id: target.id,
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      phone: target.phone,
      roleKeys: [dto.roleKey],
      isActive: target.isActive,
      emailVerifiedAt: target.emailVerifiedAt?.toISOString() ?? null,
      createdAt: target.createdAt.toISOString(),
    };
  }

  async deactivate(actor: Actor, userId: string): Promise<{ success: true }> {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { select: { key: true } } } } },
    });
    if (!target) throw new NotFoundException('User not found');

    const targetKeys = target.roles.map((r) => r.role.key);
    if (
      !actor.roleKeys.includes('owner') &&
      (targetKeys.includes('owner') || targetKeys.includes('manager'))
    ) {
      throw new ForbiddenException('Cannot deactivate this user');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  async reactivate(userId: string): Promise<{ success: true }> {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    return { success: true };
  }

  private assertCanManage(actor: Actor, targetRole: StaffRoleKey): void {
    const actorRoles = actor.roleKeys as StaffRoleKey[];
    const canManage = actorRoles.some((r) => ROLE_HIERARCHY[r]?.includes(targetRole));
    if (!canManage) {
      throw new ForbiddenException(`Cannot manage role ${targetRole}`);
    }
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
