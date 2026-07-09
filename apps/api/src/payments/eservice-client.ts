import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { ENV_TYPE } from '../config/config.module';

// GP API version pin — every request carries this header (both spellings of the
// header key are accepted by the gateway; we send the lowercase one it echoes).
const GP_VERSION = '2021-03-22';

const BASE_URLS: Record<'sandbox' | 'production', string> = {
  sandbox: 'https://apis.sandbox.eservicegateway.com',
  production: 'https://apis.eservicegateway.com',
};

/**
 * eService (Global Payments GP API) HTTP client. Thin wrapper over Node's
 * built-in `fetch` that:
 *  - derives the base URL from `ESERVICE_ENV`,
 *  - obtains + caches the bearer access token (reusable ~24h) and refreshes it
 *    on expiry or on a 401 / `ACTION_NOT_AUTHORIZED` response,
 *  - always attaches the `X-GP-Version` header.
 *
 * No third-party SDK — the whole surface we need is a handful of REST calls.
 */
export class EserviceClient {
  private readonly logger = new Logger(EserviceClient.name);
  private readonly baseUrl: string;

  // In-memory access-token cache. Refreshed lazily; a small skew is subtracted
  // from the advertised lifetime so we never present a token that expires
  // mid-flight.
  private token: string | null = null;
  private tokenExpiresAt = 0; // epoch ms
  private inflightToken: Promise<string> | null = null;

  private static readonly EXPIRY_SKEW_MS = 60_000;

  constructor(private readonly env: ENV_TYPE) {
    this.baseUrl = BASE_URLS[env.ESERVICE_ENV] ?? BASE_URLS.sandbox;
  }

  /**
   * The `secret` sent to the access-token endpoint: SHA512(nonce + app_key) hex.
   * Pure + exported for unit testing (see eservice-client.spec).
   */
  static computeSecret(nonce: string, appKey: string): string {
    return createHash('sha512').update(`${nonce}${appKey}`).digest('hex');
  }

  /**
   * Obtain a bearer token, using the in-memory cache when still valid. Concurrent
   * callers share a single in-flight request so we never stampede the token
   * endpoint. `forceRefresh` bypasses the cache (used after a 401).
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    if (this.inflightToken) return this.inflightToken;

    this.inflightToken = this.fetchAccessToken()
      .then((res) => {
        this.token = res.token;
        // `seconds_to_expire` is ~86399; subtract a skew and clamp to >0.
        const ttlMs = Math.max(res.seconds_to_expire * 1000 - EserviceClient.EXPIRY_SKEW_MS, 0);
        this.tokenExpiresAt = Date.now() + ttlMs;
        return res.token;
      })
      .finally(() => {
        this.inflightToken = null;
      });

    return this.inflightToken;
  }

  private async fetchAccessToken(): Promise<{ token: string; seconds_to_expire: number }> {
    const nonce = new Date().toISOString();
    const secret = EserviceClient.computeSecret(nonce, this.env.ESERVICE_APP_KEY);

    const res = await fetch(`${this.baseUrl}/ucp/accesstoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GP-Version': GP_VERSION,
      },
      body: JSON.stringify({
        app_id: this.env.ESERVICE_APP_ID,
        nonce,
        secret,
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`eService accesstoken failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { token?: string; seconds_to_expire?: number };
    if (!json.token) {
      throw new Error('eService accesstoken response missing token');
    }
    return { token: json.token, seconds_to_expire: json.seconds_to_expire ?? 86_399 };
  }

  /**
   * Authorized JSON request against the GP API. Attaches the bearer token +
   * `X-GP-Version`, and transparently refreshes the token once on a 401 /
   * `ACTION_NOT_AUTHORIZED` (an expired/revoked token) before retrying.
   */
  async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    _retried = false,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-gp-version': GP_VERSION,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Token expired/revoked — refresh once and retry. `ACTION_NOT_AUTHORIZED`
    // is GP's error_code for a stale token even when the HTTP status isn't 401.
    if (!res.ok && !_retried) {
      const text = await safeText(res);
      if (res.status === 401 || text.includes('ACTION_NOT_AUTHORIZED')) {
        await this.getAccessToken(true);
        return this.request<T>(method, path, body, true);
      }
      throw new Error(`eService ${method} ${path} failed (${res.status}): ${text}`);
    }
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`eService ${method} ${path} failed (${res.status}): ${text}`);
    }

    // Some endpoints (e.g. link expire) may return an empty body on success.
    const text = await res.text();
    return (text.length === 0 ? {} : JSON.parse(text)) as T;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unreadable body>';
  }
}
