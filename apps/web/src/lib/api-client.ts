'use client';

import type { ApiClient } from '@repo/api-client';

/**
 * Lazy handle to the typed API client.
 *
 * `@repo/api-client` validates every request/response with the Zod schemas
 * from `@repo/types`; building those schemas is the single most expensive
 * piece of JS on a cold page load (~150 KB, ~100 ms of main-thread work on a
 * fast desktop, several times that on a phone) — and marketing pages don't
 * call the API until after the first paint, if at all.
 *
 * `getApiClient()` therefore returns a proxy with the exact `ApiClient` shape:
 * property access just records the path (`cart.get`), and the first *call*
 * imports the real client (`./api-client-impl`) and forwards to it. Every
 * client method already returns a Promise, so callers are unaffected.
 */
let real: Promise<ApiClient> | undefined;

function loadClient(): Promise<ApiClient> {
  real ??= import('./api-client-impl').then((m) => m.getApiClientNow());
  return real;
}

function lazyNode(path: string[]): unknown {
  const call = (...args: unknown[]) =>
    loadClient().then((client) => {
      let parent: unknown = undefined;
      let target: unknown = client;
      for (const key of path) {
        parent = target;
        target = (target as Record<string, unknown>)[key];
      }
      if (typeof target !== 'function') {
        throw new TypeError(`apiClient.${path.join('.')} is not a function`);
      }
      return (target as (...a: unknown[]) => unknown).apply(parent, args);
    });
  return new Proxy(call, {
    get(_target, key) {
      // Never look like a thenable / iterable to `await` or devtools.
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return lazyNode([...path, key]);
    },
  });
}

const lazyClient = lazyNode([]) as ApiClient;

export function getApiClient(): ApiClient {
  return lazyClient;
}
