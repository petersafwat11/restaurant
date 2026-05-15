import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
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
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { refreshToken?: string }) {
    await this.auth.logout(body?.refreshToken);
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
  verifyOtp(@Body(new ZodValidationPipe(VerifyOtpSchema)) dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
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
}
