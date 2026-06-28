import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AccountDeletionStatusResponseDto,
  type ConfirmAccountDeletionDto,
  ConfirmAccountDeletionSchema,
  type RequestAccountDeletionDto,
  RequestAccountDeletionSchema,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { AccountDeletionService } from './account-deletion.service';

/**
 * Self-service account deletion (GDPR erasure, plan §G2).
 *
 * These are CUSTOMER self-service routes, so they intentionally carry NO
 * `@Permissions` decorator — the `customer` role has an empty permission set, so
 * any permission gate would lock every customer out. The global `JwtAuthGuard`
 * still requires a valid session (same posture as `/auth/me`, `/addresses`); the
 * service only ever acts on the authenticated user's own account.
 */
@ApiTags('account-deletion')
@Controller('account/deletion')
export class AccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}

  @Get()
  getStatus(@CurrentUser() user: RequestUser): Promise<AccountDeletionStatusResponseDto> {
    return this.service.getStatus(user.id);
  }

  @RateLimit({ name: 'account:deletion-request', limit: 5, windowSeconds: 3600 })
  @Post('request')
  @HttpCode(200)
  request(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(RequestAccountDeletionSchema)) dto: RequestAccountDeletionDto,
  ): Promise<AccountDeletionStatusResponseDto> {
    return this.service.request(user.id, dto);
  }

  @RateLimit({ name: 'account:deletion-confirm', limit: 10, windowSeconds: 3600 })
  @Post('confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(ConfirmAccountDeletionSchema)) dto: ConfirmAccountDeletionDto,
  ): Promise<AccountDeletionStatusResponseDto> {
    return this.service.confirm(user.id, dto);
  }

  @RateLimit({ name: 'account:deletion-cancel', limit: 10, windowSeconds: 3600 })
  @Post('cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: RequestUser): Promise<AccountDeletionStatusResponseDto> {
    return this.service.cancel(user.id);
  }
}
