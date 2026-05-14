import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken } from '@repo/auth-core';
import type { FastifyRequest } from 'fastify';
import { ENV, type ENV_TYPE } from '../../config/config.module';
import type { RequestUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: ENV_TYPE,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const header = req.headers.authorization;

    // Public routes: attempt to attach a user if a valid Bearer token is
    // present (so cart endpoints can identify authed callers without
    // requiring auth), but never throw.
    if (isPublic) {
      if (header?.startsWith('Bearer ')) {
        const token = header.slice('Bearer '.length).trim();
        try {
          const claims = verifyAccessToken(token, {
            accessSecret: this.env.JWT_ACCESS_SECRET,
            refreshSecret: this.env.JWT_REFRESH_SECRET,
            accessTtl: this.env.JWT_ACCESS_TTL,
            refreshTtl: this.env.JWT_REFRESH_TTL,
          });
          req.user = {
            id: claims.sub,
            email: claims.email,
            roles: claims.roles,
            permissions: claims.permissions,
          };
        } catch {
          // Ignore — public route, no user attached.
        }
      }
      return true;
    }

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const token = header.slice('Bearer '.length).trim();

    try {
      const claims = verifyAccessToken(token, {
        accessSecret: this.env.JWT_ACCESS_SECRET,
        refreshSecret: this.env.JWT_REFRESH_SECRET,
        accessTtl: this.env.JWT_ACCESS_TTL,
        refreshTtl: this.env.JWT_REFRESH_TTL,
      });
      req.user = {
        id: claims.sub,
        email: claims.email,
        roles: claims.roles,
        permissions: claims.permissions,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
