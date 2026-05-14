'use client';

import { useAuthStore } from '@/stores/auth-store';
import { type ApiClient, createApiClient } from '@repo/api-client';
import { env } from './env';

let cached: ApiClient | undefined;

export function getApiClient(): ApiClient {
  if (cached) return cached;

  cached = createApiClient({
    baseUrl: env.NEXT_PUBLIC_API_URL,
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken: async () => {
      // Pull refresh token from server-side httpOnly cookie
      const cookieRes = await fetch('/api/auth/get-refresh-token', {
        credentials: 'include',
      });
      if (!cookieRes.ok) return null;
      const { refreshToken } = (await cookieRes.json()) as {
        refreshToken: string | null;
      };
      if (!refreshToken) return null;

      // Direct call to API (not via cached client to avoid recursion)
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;

      const tokens = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      useAuthStore.getState().setAccessToken(tokens.accessToken);
      // Rotate the cookie
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        credentials: 'include',
      });
      return tokens.accessToken;
    },
    onUnauthorized: () => {
      useAuthStore.getState().clearSession();
    },
  });

  return cached;
}
