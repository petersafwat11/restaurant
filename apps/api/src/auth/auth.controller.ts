import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AuthResponseDto,
  type ForgotPasswordDto,
  ForgotPasswordSchema,
  type LoginDto,
  LoginSchema,
  type RefreshDto,
  RefreshSchema,
  type RegisterDto,
  RegisterSchema,
  type RequestOtpDto,
  RequestOtpSchema,
  type ResetPasswordDto,
  ResetPasswordSchema,
  type VerifyEmailDto,
  VerifyEmailSchema,
  type VerifyOtpDto,
  VerifyOtpSchema,
} from '@repo/types';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  clearAuthCookies,
  isCookieAudience,
  readAudience,
  readRefreshCookie,
  setAuthCookies,
} from '../common/auth/cookies';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { type AuthIssueResult, AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: ENV_TYPE,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.register(dto);
    return this.respondWithTokens(req, reply, result);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.login(dto);
    return this.respondWithTokens(req, reply, result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
    // Header-based path (mobile). Web/admin transparently refresh via the
    // guard + interceptor — they never call this endpoint.
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: { refreshToken?: string },
  ) {
    const audience = readAudience(req);
    let rt = body?.refreshToken;
    if (!rt && isCookieAudience(audience)) {
      rt = readRefreshCookie(req, audience) ?? undefined;
    }
    await this.auth.logout(rt);
    if (isCookieAudience(audience)) {
      clearAuthCookies(reply, this.env, audience);
    }
    return { success: true as const };
  }

  @Public()
  @Post('request-otp')
  @HttpCode(200)
  async requestOtp(@Body(new ZodValidationPipe(RequestOtpSchema)) dto: RequestOtpDto) {
    await this.auth.requestOtp(dto);
    return { success: true as const };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(200)
  async verifyOtp(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body(new ZodValidationPipe(VerifyOtpSchema)) dto: VerifyOtpDto,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.verifyOtp(dto);
    return this.respondWithTokens(req, reply, result);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordSchema)) dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return { success: true as const };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body(new ZodValidationPipe(ResetPasswordSchema)) dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { success: true as const };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto);
    return { success: true as const };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  // ---- helpers ----------------------------------------------------------

  private respondWithTokens(
    req: FastifyRequest,
    reply: FastifyReply,
    result: AuthIssueResult,
  ): AuthResponseDto {
    const audience = readAudience(req);
    if (isCookieAudience(audience)) {
      setAuthCookies(reply, this.env, audience, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
      return { user: result.user };
    }
    // Mobile / header-based — return tokens in body as today.
    return result;
  }
}
