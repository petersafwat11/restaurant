import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { hashPassword, verifyPassword } from '@repo/auth-core';
import type {
  AdminSetUserPasswordDto,
  ChangePasswordDto,
  MeDto,
  UpdateProfileDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  userId: string;
  roleKeys: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<MeDto> {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.locale !== undefined) data.locale = dto.locale;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
      roles: user.roles.map((ur) => ur.role.key),
      permissions: Array.from(
        new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
      ) as MeDto['permissions'],
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.passwordHash) {
      throw new BadRequestException('Account has no password set');
    }
    const ok = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Owner-only: force-set another user's password (staff or customer).
   * Defence-in-depth — the route is already guarded by `user:set_password`
   * (granted to the owner role only), but the actor's roles are re-checked
   * here so a mis-seeded role can never reach this path.
   */
  async adminSetPassword(actor: Actor, userId: string, dto: AdminSetUserPasswordDto): Promise<void> {
    if (!actor.roleKeys.includes('owner')) {
      throw new ForbiddenException('Only an owner can set another user\'s password');
    }

    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
