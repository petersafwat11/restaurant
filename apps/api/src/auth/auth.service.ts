import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type JwtConfig,
  generateOtp,
  hashPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '@repo/auth-core';
import {
  JOB_EMAIL_PASSWORD_RESET,
  JOB_EMAIL_VERIFICATION,
  JOB_SMS_OTP,
  QUEUE_EMAIL,
  QUEUE_SMS,
} from '@repo/jobs';
import type {
  AuthResponseDto,
  AuthTokensDto,
  ForgotPasswordDto,
  LoginDto,
  MeDto,
  RegisterDto,
  RequestOtpDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyOtpDto,
} from '@repo/types';
import type { Queue } from 'bullmq';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ReferralsService } from '../referrals/referrals.service';

const OTP_TTL_SECONDS = 5 * 60;
const VERIFY_EMAIL_TTL_SECONDS = 24 * 60 * 60;
const RESET_PASSWORD_TTL_SECONDS = 60 * 60;

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    @Inject(ENV) private readonly env: ENV_TYPE,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
    private readonly referrals: ReferralsService,
  ) {
    this.jwtConfig = {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    };
  }

  // ---- registration / login ---------------------------------------------

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await hashPassword(dto.password);

    const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'customer' } });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone ?? null,
        passwordHash,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        roles: { create: { roleId: customerRole.id } },
      },
      include: this.userInclude(),
    });

    // Link a pending referral if a code was supplied (never blocks signup).
    await this.referrals.attachReferralOnSignup(user.id, dto.referralCode);

    // Fire verification email (queued — never awaited inline)
    const token = await this.storeOneOffToken('verify-email', user.id, VERIFY_EMAIL_TTL_SECONDS);
    await this.emailQueue.add(JOB_EMAIL_VERIFICATION, {
      userId: user.id,
      email: user.email,
      token,
      verifyUrl: `${this.env.APP_URL_WEB}/verify-email?token=${token}`,
    });

    return this.issueTokensFor(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: this.userInclude(),
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    return this.issueTokensFor(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const claims = verifyRefreshToken(refreshToken, this.jwtConfig);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(claims.jti), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid token — nothing to revoke
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let claims;
    try {
      claims = verifyRefreshToken(refreshToken, this.jwtConfig);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(claims.jti) },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: claims.sub },
      include: this.userInclude(),
    });

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken: newRefresh, expiresIn } = await this.mintTokens(user);
    return { accessToken, refreshToken: newRefresh, expiresIn };
  }

  // ---- OTP --------------------------------------------------------------

  async requestOtp(dto: RequestOtpDto): Promise<void> {
    const code = generateOtp(6);
    await this.redis.client.set(
      this.otpKey(dto.phone),
      hashToken(code),
      'EX',
      OTP_TTL_SECONDS,
    );
    await this.smsQueue.add(JOB_SMS_OTP, {
      phone: dto.phone,
      code,
      expiresInSeconds: OTP_TTL_SECONDS,
    });
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const stored = await this.redis.client.get(this.otpKey(dto.phone));
    if (!stored || stored !== hashToken(dto.code)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.client.del(this.otpKey(dto.phone));

    // Find or create user by phone
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: this.userInclude(),
    });

    if (!user) {
      const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'customer' } });
      const synthEmail = `phone+${dto.phone.replace(/[^0-9]/g, '')}@phone.local`;
      user = await this.prisma.user.create({
        data: {
          email: synthEmail,
          phone: dto.phone,
          phoneVerifiedAt: new Date(),
          roles: { create: { roleId: customerRole.id } },
        },
        include: this.userInclude(),
      });
    } else if (!user.phoneVerifiedAt) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
        include: this.userInclude(),
      });
    }

    return this.issueTokensFor(user);
  }

  // ---- password reset / email verification ------------------------------

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // Don't leak existence

    const token = await this.storeOneOffToken('reset-password', user.id, RESET_PASSWORD_TTL_SECONDS);
    await this.emailQueue.add(JOB_EMAIL_PASSWORD_RESET, {
      userId: user.id,
      email: user.email,
      token,
      resetUrl: `${this.env.APP_URL_WEB}/reset-password?token=${token}`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.consumeOneOffToken('reset-password', dto.token);
    if (!userId) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const userId = await this.consumeOneOffToken('verify-email', dto.token);
    if (!userId) throw new BadRequestException('Invalid or expired token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  // ---- me ---------------------------------------------------------------

  async me(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: this.userInclude(),
    });
    return this.toMeDto(user);
  }

  // ---- helpers ----------------------------------------------------------

  private userInclude() {
    return {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    } as const;
  }

  private toMeDto(user: UserWithRoles): MeDto {
    const roles = user.roles.map((ur) => ur.role.key);
    const permissions = Array.from(
      new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ) as MeDto['permissions'];

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
      roles,
      permissions,
    };
  }

  private async mintTokens(user: UserWithRoles) {
    const me = this.toMeDto(user);
    const accessToken = signAccessToken(
      { sub: user.id, email: user.email, roles: me.roles, permissions: me.permissions },
      this.jwtConfig,
    );
    const jti = randomBytes(32).toString('hex');
    const refreshToken = signRefreshToken({ sub: user.id, jti }, this.jwtConfig);

    const expiresAt = new Date(Date.now() + ttlToMs(this.env.JWT_REFRESH_TTL));
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(jti), expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: Math.floor(ttlToMs(this.env.JWT_ACCESS_TTL) / 1000) };
  }

  private async issueTokensFor(user: UserWithRoles): Promise<AuthResponseDto> {
    const tokens = await this.mintTokens(user);
    return { ...tokens, user: this.toMeDto(user) };
  }

  private otpKey(phone: string): string {
    return `otp:phone:${phone}`;
  }

  private async storeOneOffToken(kind: string, userId: string, ttlSeconds: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.redis.client.set(`token:${kind}:${hashToken(token)}`, userId, 'EX', ttlSeconds);
    return token;
  }

  private async consumeOneOffToken(kind: string, token: string): Promise<string | null> {
    const key = `token:${kind}:${hashToken(token)}`;
    const userId = await this.redis.client.get(key);
    if (!userId) return null;
    await this.redis.client.del(key);
    return userId;
  }
}

type UserWithRoles = NonNullable<Awaited<ReturnType<PrismaService['user']['findUnique']>>> & {
  roles: Array<{
    role: {
      key: string;
      permissions: Array<{ permission: { key: string } }>;
    };
  }>;
};

function ttlToMs(value: string | number): number {
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return Number.parseInt(value, 10) * 1000;
  const n = Number.parseInt(match[1] ?? '0', 10);
  switch (match[2]) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return n * 1000;
  }
}
