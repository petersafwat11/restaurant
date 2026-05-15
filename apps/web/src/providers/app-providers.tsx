'use client';

import { getApiClient } from '@/lib/api-client';
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
