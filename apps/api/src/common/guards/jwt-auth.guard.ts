import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken } from '@repo/auth-core';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../../auth/auth.service';
import { ENV, type ENV_TYPE } from '../../config/config.module';
import {
  isCookieAudience,
  readAccessCookie,
  readAudience,
  readRefreshCookie,
} from '../auth/cookies';
import type { RequestUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Request decorations consumed by the SlidingRefreshInterceptor.
export interface AuthedRequest extends FastifyRequest {
  user?: RequestUser;
  _newTokens?: { accessToken: string; refreshToken: string; expiresIn: number };
  _slidingRefresh?: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: ENV_TYPE,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const audience = readAudience(req);

    // Public routes: best-effort attach. Try Bearer first, then cookie.
    if (isPublic) {
      if (header?.startsWith('Bearer ')) {
        const token = header.slice('Bearer '.length).trim();
        this.tryAttachFromToken(req, token);
      } else if (isCookieAudience(audience)) {
        const at = readAccessCookie(req, audience);
        if (at) this.tryAttachFromToken(req, at);
      }
      return true;
    }

    // 1. Authorization: Bearer wins (mobile / server-to-server).
    if (header?.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      try {
        const claims = this.verify(token);
        req.user = this.toUser(claims);
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }

    // 2. Cookie path needs an audience.
    if (!isCookieAudience(audience)) {
      throw new UnauthorizedException('Missing or invalid Authorization');
    }

    // 3. Try access-token cookie.
    const at = readAccessCookie(req, audience);
    if (at) {
      try {
        const claims = this.verify(at);
        req.user = this.toUser(claims);
        // Sliding refresh: if the AT is close to expiry, mark for interceptor.
        const exp = (claims as { exp?: number }).exp;
        if (
          exp &&
          exp * 1000 - Date.now() < this.env.AUTH_SLIDING_REFRESH_THRESHOLD * 1000
        ) {
          req._slidingRefresh = true;
        }
        return true;
      } catch {
        // Fall through to refresh-token path.
      }
    }

    // 4. AT missing/expired → try inline rotation using RT cookie.
    const rt = readRefreshCookie(req, audience);
    if (!rt) {
      throw new UnauthorizedException('Not authenticated');
    }

    let rotated: { accessToken: string; refreshToken: string; expiresIn: number };
    try {
      rotated = await this.authService.refresh(rt);
    } catch {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    // The newly minted AT is the source of truth for req.user this request.
    const claims = this.verify(rotated.accessToken);
    req.user = this.toUser(claims);
    req._newTokens = rotated;
    return true;
  }

  private verify(token: string) {
    return verifyAccessToken(token, {
      accessSecret: this.env.JWT_ACCESS_SECRET,
      refreshSecret: this.env.JWT_REFRESH_SECRET,
      accessTtl: this.env.JWT_ACCESS_TTL,
      refreshTtl: this.env.JWT_REFRESH_TTL,
    });
  }

  private toUser(claims: ReturnType<typeof verifyAccessToken>): RequestUser {
    return {
      id: claims.sub,
      email: claims.email,
      roles: claims.roles,
      permissions: claims.permissions,
    };
  }

  private tryAttachFromToken(req: AuthedRequest, token: string): void {
    try {
      const claims = this.verify(token);
      req.user = this.toUser(claims);
    } catch {
      // Public route — ignore.
    }
  }
}
