'use client';

import { type RealtimeClient, createRealtimeClient } from '@repo/realtime-client';
import { env } from './env';

let cached: RealtimeClient | undefined;

/**
 * Singleton realtime client. The URL is the API base (Socket.IO mounts on
 * the same host) minus the `/api/v1` suffix — Socket.IO uses its own path.
 */
export function getRealtimeClient(): RealtimeClient {
  if (cached) return cached;
  const wsUrl = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  cached = createRealtimeClient({
    url: wsUrl,
    audience: 'web',
  });
  return cached;
}
