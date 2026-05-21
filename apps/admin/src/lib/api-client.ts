'use client';

import { useAuthStore } from '@/stores/auth-store';
import { type ApiClient, createApiClient } from '@repo/api-client';
import { env } from './env';

let cached: ApiClient | undefined;

export function getApiClient(): ApiClient {
  if (cached) return cached;

  cached = createApiClient({
    baseUrl: env.NEXT_PUBLIC_API_URL,
    audience: 'admin',
    onUnauthorized: () => {
      useAuthStore.getState().clearSession();
    },
  });

  return cached;
}
