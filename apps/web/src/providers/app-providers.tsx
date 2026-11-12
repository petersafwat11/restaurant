'use client';

import { Toaster } from '@/components/toaster';
import { getApiClient } from '@/lib/api-client';
import { captureFirstTouch } from '@/lib/attribution';
import { makeQueryClient } from '@/lib/query-client';
import { getRealtimeClient } from '@/lib/realtime-client';
import { useAuthStore } from '@/stores/auth-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const markHydrated = useAuthStore((s) => s.markHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      try {
        const me = await getApiClient().auth.me();
        setUser(me);
      } catch {
        // Not authenticated — fine
      } finally {
        markHydrated();
      }
    })();
  }, [markHydrated, setUser]);

  // Connect/disconnect the realtime singleton on auth changes.
  useEffect(() => {
    const client = getRealtimeClient();
    if (user) {
      client.connect().catch(() => {});
    } else {
      client.disconnect();
    }
  }, [user]);

  // First-touch order-source attribution (UTM / referrer host / landing path).
  useEffect(() => {
    captureFirstTouch();
  }, []);

  // Register customer Web PWA service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
