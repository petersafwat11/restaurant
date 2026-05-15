import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FeatureFlagKey } from '@repo/feature-flags';
import { FeatureFlagsService } from './feature-flags.service';

export const FEATURE_FLAG_KEY = 'feature-flag';

/** Gate a route behind a feature flag. Resolves against the current user. */
export const FeatureFlag = (key: FeatureFlagKey) => SetMetadata(FEATURE_FLAG_KEY, key);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flags: FeatureFlagsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<FeatureFlagKey | undefined>(FEATURE_FLAG_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!key) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const enabled = await this.flags.isEnabled(key, req.user?.id ?? null);
    if (!enabled) {
      throw new ForbiddenException(`Feature "${key}" is not enabled`);
    }
    return true;
  }
}
