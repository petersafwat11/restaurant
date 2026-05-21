import { getApiClient } from '@/lib/api-client';
import { makeQueryClient } from '@/lib/query-client';
import { getRealtimeClient } from '@/lib/realtime-client';
import { useAuthStore } from '@/stores/auth-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/i18n';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const hydrate = useAuthStore((s) => s.hydrate);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      await hydrate();
      try {
        const me = await getApiClient().auth.me();
        setUser(me);
      } catch {
        // Not authenticated; auth guard will redirect
      }
    })();
  }, [hydrate, setUser]);

  useEffect(() => {
    const client = getRealtimeClient();
    if (user) {
      client.connect().catch(() => {});
    } else {
      client.disconnect();
    }
  }, [user]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}
