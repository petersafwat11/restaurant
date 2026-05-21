import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Read secrets directly from process.env to avoid pulling in the full env
// schema at module-load time — this file is exercised by unit tests that
// don't have a fully populated env, and the production runtime still reads
// the same vars.
function secret(): string {
  const s = process.env.ORDER_TRACKING_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!s) {
    throw new Error(
      'ORDER_TRACKING_SECRET (or JWT_ACCESS_SECRET fallback) must be set',
    );
  }
  return s;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signOrderTrackingToken(
  orderId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest();
  return `${base64UrlEncode(payload)}.${base64UrlEncode(sig)}`;
}

export type VerifyResult =
  | { ok: true; orderId: string; exp: number }
  | { ok: false; reason: 'malformed' | 'invalid_signature' | 'expired' };

export function verifyOrderTrackingToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payloadB64, sigB64] = parts;

  let payload: string;
  let providedSig: Buffer;
  try {
    payload = base64UrlDecode(payloadB64).toString('utf8');
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const [orderId, expStr] = payload.split('.');
  const exp = Number(expStr);
  if (!orderId || !Number.isFinite(exp)) return { ok: false, reason: 'malformed' };

  const expectedSig = createHmac('sha256', secret()).update(payload).digest();
  if (providedSig.length !== expectedSig.length) {
    return { ok: false, reason: 'invalid_signature' };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  if (Math.floor(Date.now() / 1000) > exp) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, orderId, exp };
}
