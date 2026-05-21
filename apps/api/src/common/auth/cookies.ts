import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AUTH_AUDIENCE_HEADER, type AuthAudience } from '@repo/types';
import type { ENV_TYPE } from '../../config/config.module';

export const COOKIE_AUDIENCES = ['web', 'admin'] as const;
export type CookieAudience = (typeof COOKIE_AUDIENCES)[number];

export function readAudience(req: FastifyRequest): AuthAudience | null {
  const raw = req.headers[AUTH_AUDIENCE_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'web' || value === 'admin' || value === 'mobile') return value;
  return null;
}

export function isCookieAudience(audience: AuthAudience | null): audience is CookieAudience {
  return audience === 'web' || audience === 'admin';
}

export function accessCookieName(audience: CookieAudience): string {
  return `${audience}_at`;
}

export function refreshCookieName(audience: CookieAudience): string {
  return `${audience}_rt`;
}

export function readAccessCookie(req: FastifyRequest, audience: CookieAudience): string | null {
  return (req.cookies?.[accessCookieName(audience)] ?? null) || null;
}

export function readRefreshCookie(req: FastifyRequest, audience: CookieAudience): string | null {
  return (req.cookies?.[refreshCookieName(audience)] ?? null) || null;
}

function baseCookieOptions(env: ENV_TYPE): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  env: ENV_TYPE,
  audience: CookieAudience,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): void {
  const base = baseCookieOptions(env);
  reply.setCookie(accessCookieName(audience), tokens.accessToken, {
    ...base,
    maxAge: tokens.expiresIn,
  });
  reply.setCookie(refreshCookieName(audience), tokens.refreshToken, {
    ...base,
    maxAge: ttlToSeconds(env.JWT_REFRESH_TTL),
  });
}

export function clearAuthCookies(
  reply: FastifyReply,
  env: ENV_TYPE,
  audience: CookieAudience,
): void {
  const base = baseCookieOptions(env);
  reply.clearCookie(accessCookieName(audience), base);
  reply.clearCookie(refreshCookieName(audience), base);
}

export function ttlToSeconds(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return Number.parseInt(value, 10);
  const n = Number.parseInt(match[1] ?? '0', 10);
  switch (match[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 60 * 60;
    case 'd':
      return n * 24 * 60 * 60;
    default:
      return n;
  }
}
