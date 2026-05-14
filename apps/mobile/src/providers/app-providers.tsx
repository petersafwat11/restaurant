import { getApiClient } from '@/lib/api-client';
import { makeQueryClient } from '@/lib/query-client';
import { getRealtimeClient } from '@/lib/realtime-client';
import { useAuthStore } from '@/stores/auth-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

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

  // TODO(ui): wrap children in `<StripeProvider publishableKey={...}>` from
  // @stripe/stripe-react-native once the UI sprint lands. Fetch the
  // publishable key via `usePaymentConfig()`. Sprint 9 wires Apple/Google Pay
  // via the same provider.
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
