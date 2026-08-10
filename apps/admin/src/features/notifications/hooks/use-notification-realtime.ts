'use client';

import { getRealtimeClient } from '@/lib/realtime-client';
import { ROOMS } from '@repo/types';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { notificationQueryKeys } from '../query-keys';

export function useNotificationRealtime(userId: string | null | undefined): void {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!userId) return;

    const client = getRealtimeClient();
    let mounted = true;
    let unsubscribeEvent: (() => void) | undefined;

    void (async () => {
      try {
        await client.connect();
        if (!mounted) return;
        await client.subscribe(ROOMS.user(userId));
        if (!mounted) return;
        unsubscribeEvent = client.on('notification.created', () => {
          void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
        });
      } catch {
        // Initial fetching still keeps the panel useful when Socket.IO is unavailable.
      }
    })();

    return () => {
      mounted = false;
      unsubscribeEvent?.();
      // Keep the per-user room for the life of the authenticated socket. The
      // app provider disconnects that socket on logout; retaining the room
      // here avoids Strict Mode subscribe/unsubscribe races during remounts.
    };
  }, [queryClient, userId]);
}
