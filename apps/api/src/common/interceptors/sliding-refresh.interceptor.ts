import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { type Observable, defer, from, mergeMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { ENV, type ENV_TYPE } from '../../config/config.module';
import {
  isCookieAudience,
  readAudience,
  readRefreshCookie,
  setAuthCookies,
} from '../auth/cookies';
import type { AuthedRequest } from '../guards/jwt-auth.guard';

@Injectable()
export class SlidingRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SlidingRefreshInterceptor.name);

  constructor(
    @Inject(ENV) private readonly env: ENV_TYPE,
    private readonly authService: AuthService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const reply = http.getResponse<FastifyReply>();
    const audience = readAudience(req);

    // If the guard already rotated tokens, write them now and proceed.
    if (req._newTokens && isCookieAudience(audience)) {
      setAuthCookies(reply, this.env, audience, req._newTokens);
      return next.handle();
    }

    // Sliding refresh: AT was still valid but near expiry. Best-effort —
    // failure must not break the user's request.
    if (req._slidingRefresh && isCookieAudience(audience)) {
      const rt = readRefreshCookie(req, audience);
      if (!rt) return next.handle();
      return defer(() => from(this.authService.refresh(rt))).pipe(
        mergeMap((tokens) => {
          setAuthCookies(reply, this.env, audience, tokens);
          return next.handle();
        }),
        catchError((err) => {
          this.logger.debug(`Sliding refresh skipped: ${(err as Error).message}`);
          return next.handle();
        }),
      );
    }

    return next.handle();
  }
}
