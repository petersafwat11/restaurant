'use client';

import { getApiClient } from '@/lib/api-client';
import { captureFirstTouch } from '@/lib/attribution';
import { makeQueryClient } from '@/lib/query-client';
import { hasActiveSession } from '@/lib/session-probe';
import { useAuthStore } from '@/stores/auth-store';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { type ReactNode, useEffect, useRef, useState } from 'react';

// Toasts only appear after a user action, so the toaster (sonner) loads after
// hydration instead of in the initial bundle of every page.
const Toaster = dynamic(() => import('@/components/toaster').then((m) => m.Toaster), {
  ssr: false,
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const markHydrated = useAuthStore((s) => s.markHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      try {
        // Anonymous visitors stop at the probe (no API-client / Zod download).
        if (await hasActiveSession()) {
          const me = await getApiClient().auth.me();
          setUser(me);
        }
      } catch {
        // Not authenticated — fine
      } finally {
        markHydrated();
      }
    })();
  }, [markHydrated, setUser]);

  // Connect/disconnect the realtime singleton on auth changes. Socket.IO is
  // only needed for signed-in users, so the client is imported on demand
  // rather than shipped to every anonymous visitor.
  const realtimeLoaded = useRef(false);
  useEffect(() => {
    // Anonymous visitor who never signed in: nothing to connect or tear down.
    if (!user && !realtimeLoaded.current) return;
    realtimeLoaded.current = true;
    let cancelled = false;
    import('@/lib/realtime-client').then(({ getRealtimeClient }) => {
      if (cancelled) return;
      const client = getRealtimeClient();
      if (user) {
        client.connect().catch(() => {});
      } else {
        client.disconnect();
      }
    });
    return () => {
      cancelled = true;
    };
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
