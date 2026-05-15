import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, tap } from 'rxjs';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AUDIT_ACTION_KEY, type AuditActionMeta } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditActionMeta>(AUDIT_ACTION_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<{
      user?: RequestUser;
      headers: Record<string, string | undefined>;
      ip?: string;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
    }>();
    const user = req.user;
    if (!user) return next.handle();

    return next.handle().pipe(
      tap((result) => {
        const resourceId = extractId(result, meta.idFrom ?? 'id', req.params, req.body);
        if (!resourceId) return;
        this.audit
          .record({
            actorUserId: user.id,
            restaurantId: extractRestaurantId(result, req.params, req.body),
            action: meta.action,
            resourceType: meta.resourceType,
            resourceId,
            afterJson: result ?? null,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          })
          .catch(() => {
            /* never block the request */
          });
      }),
    );
  }
}

function extractId(
  result: unknown,
  key: string,
  params?: Record<string, string>,
  body?: Record<string, unknown>,
): string | null {
  if (result && typeof result === 'object') {
    const v = (result as Record<string, unknown>)[key];
    if (typeof v === 'string') return v;
  }
  if (params && params[key]) return params[key];
  if (body && typeof body[key] === 'string') return body[key] as string;
  // Some endpoints respond with { success: true } only — fall back to params.id.
  if (params?.id) return params.id;
  return null;
}

function extractRestaurantId(
  result: unknown,
  params?: Record<string, string>,
  body?: Record<string, unknown>,
): string | null {
  if (result && typeof result === 'object') {
    const v = (result as Record<string, unknown>).restaurantId;
    if (typeof v === 'string') return v;
  }
  if (params?.restaurantId) return params.restaurantId;
  if (typeof body?.restaurantId === 'string') return body.restaurantId;
  return null;
}
