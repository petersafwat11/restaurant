import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ENV_TYPE } from '../../config/config.module';
import { EserviceClient } from '../eservice-client';

// Minimal env stub — only the eService fields the client reads.
const env = {
  ESERVICE_ENV: 'sandbox',
  ESERVICE_APP_ID: 'app_123',
  ESERVICE_APP_KEY: 'super_secret_key',
  ESERVICE_ACCOUNT_NAME: 'acct',
  ESERVICE_WEBHOOK_URL: 'https://api.example.test',
  ESERVICE_RETURN_URL: 'https://web.example.test/return',
} as unknown as ENV_TYPE;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('EserviceClient.computeSecret (access-token secret)', () => {
  it('is SHA512(nonce + app_key) as lowercase hex', () => {
    const nonce = '2026-07-08T00:00:00.000Z';
    const expected = createHash('sha512').update(`${nonce}${env.ESERVICE_APP_KEY}`).digest('hex');
    expect(EserviceClient.computeSecret(nonce, env.ESERVICE_APP_KEY)).toBe(expected);
    // 512 bits → 128 hex chars.
    expect(EserviceClient.computeSecret(nonce, env.ESERVICE_APP_KEY)).toHaveLength(128);
  });

  it('changes when the nonce or key changes', () => {
    const a = EserviceClient.computeSecret('n1', 'k1');
    expect(EserviceClient.computeSecret('n2', 'k1')).not.toBe(a);
    expect(EserviceClient.computeSecret('n1', 'k2')).not.toBe(a);
  });
});

describe('EserviceClient token cache', () => {
  it('fetches a token once and reuses it while valid', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/ucp/accesstoken')) {
        return jsonResponse({ token: 'tok_A', seconds_to_expire: 86_399, scope: 's' });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EserviceClient(env);
    const t1 = await client.getAccessToken();
    const t2 = await client.getAccessToken();
    expect(t1).toBe('tok_A');
    expect(t2).toBe('tok_A');
    // Only one token request despite two calls.
    const tokenCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/ucp/accesstoken'));
    expect(tokenCalls).toHaveLength(1);
  });

  it('refreshes the token when forced (simulating a 401 recovery)', async () => {
    let issued = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/ucp/accesstoken')) {
        issued += 1;
        return jsonResponse({ token: `tok_${issued}`, seconds_to_expire: 86_399 });
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EserviceClient(env);
    expect(await client.getAccessToken()).toBe('tok_1');
    // Cached — no new issue.
    expect(await client.getAccessToken()).toBe('tok_1');
    // Force refresh (what request() does after ACTION_NOT_AUTHORIZED/401).
    expect(await client.getAccessToken(true)).toBe('tok_2');
  });

  it('retries a request once with a fresh token on a 401', async () => {
    let tokens = 0;
    let linkAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/ucp/accesstoken')) {
        tokens += 1;
        return jsonResponse({ token: `tok_${tokens}`, seconds_to_expire: 86_399 });
      }
      // First protected call 401s (stale token), second succeeds.
      linkAttempts += 1;
      if (linkAttempts === 1) {
        return jsonResponse({ error_code: 'ACTION_NOT_AUTHORIZED' }, { status: 401 });
      }
      return jsonResponse({ id: 'LNK_1', url: 'https://hpp/redirect/abc' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new EserviceClient(env);
    const res = await client.request<{ id: string }>('POST', '/ucp/links', { a: 1 });
    expect(res.id).toBe('LNK_1');
    expect(tokens).toBe(2); // initial + forced refresh
    expect(linkAttempts).toBe(2); // 401 then success
  });
});
