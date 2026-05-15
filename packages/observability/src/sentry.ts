import * as Sentry from '@sentry/node';

export interface SentryInitOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

let enabled = false;

const SCRUB_KEYS = [
  'authorization',
  'cookie',
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'cardnumber',
  'cvv',
];

function scrub(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SCRUB_KEYS.includes(k.toLowerCase()) ? '[redacted]' : scrub(v);
  }
  return out;
}

/**
 * Initialize Sentry for a Node process. No-ops when `dsn` is empty — mirrors
 * the project's Stripe/R2 "empty env → safe stub" convention so dev + tests
 * never need real credentials. PII (auth headers, bodies) is scrubbed.
 */
export function initNodeSentry(opts: SentryInitOptions): boolean {
  if (!opts.dsn) {
    enabled = false;
    return false;
  }
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment ?? 'development',
    release: opts.release,
    tracesSampleRate: opts.tracesSampleRate ?? 0,
    beforeSend(event) {
      if (event.request) {
        event.request.headers = scrub(event.request.headers) as Record<string, string>;
        event.request.data = scrub(event.request.data);
        event.request.cookies = undefined;
      }
      return event;
    },
  });
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(scrub(context) as Record<string, unknown>);
      Sentry.captureException(err);
    });
    return;
  }
  Sentry.captureException(err);
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  await Sentry.flush(timeoutMs);
}

export { Sentry };
