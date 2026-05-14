'use client';

import { useAuthStore } from '@/stores/auth-store';
import { type RealtimeClient, createRealtimeClient } from '@repo/realtime-client';
import { env } from './env';

let cached: RealtimeClient | undefined;

export function getRealtimeClient(): RealtimeClient {
  if (cached) return cached;
  const wsUrl = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  cached = createRealtimeClient({
    url: wsUrl,
    getAccessToken: () => useAuthStore.getState().accessToken,
  });
  return cached;
}
