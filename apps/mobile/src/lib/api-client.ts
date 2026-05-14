import { useAuthStore } from '@/stores/auth-store';
import { type ApiClient, createApiClient } from '@repo/api-client';
import { env } from './env';
import { secureStorage } from './secure-storage';

let cached: ApiClient | undefined;

export function getApiClient(): ApiClient {
  if (cached) return cached;

  cached = createApiClient({
    baseUrl: env.EXPO_PUBLIC_API_URL,
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken: async () => {
      const refreshToken = await secureStorage.getRefreshToken();
      if (!refreshToken) return null;
      try {
        const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
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
        await secureStorage.setRefreshToken(tokens.refreshToken);
        await secureStorage.setAccessToken(tokens.accessToken);
        return tokens.accessToken;
      } catch {
        return null;
      }
    },
    onUnauthorized: async () => {
      await useAuthStore.getState().clearSession();
    },
  });

  return cached;
}
