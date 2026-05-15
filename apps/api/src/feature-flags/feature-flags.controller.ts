import {
  Body,
  Controller,
  type ExecutionContext,
  Get,
  Param,
  Patch,
  createParamDecorator,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type UpdateFeatureFlagDto,
  UpdateFeatureFlagSchema,
} from '@repo/types';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FeatureFlagsService } from './feature-flags.service';

// Optional user — flag resolution works for anonymous callers too.
const OptionalUserId = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: { id?: string } }>();
    return req.user?.id ?? null;
  },
);

@ApiTags('feature-flags')
@Controller()
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Public()
  @Get('feature-flags')
  async resolved(@OptionalUserId() userId: string | null) {
    return { flags: await this.flags.resolveAll(userId) };
  }

  @Permissions('flags:write')
  @Get('admin/feature-flags')
  listAdmin() {
    return this.flags.listAdmin();
  }

  @Permissions('flags:write')
  @Patch('admin/feature-flags/:key')
  update(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(UpdateFeatureFlagSchema))
    dto: UpdateFeatureFlagDto,
  ) {
    return this.flags.update(key, dto);
  }
}
