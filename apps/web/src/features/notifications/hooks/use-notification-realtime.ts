'use client';

import { getRealtimeClient } from '@/lib/realtime-client';
import { ROOMS } from '@repo/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Subscribes the signed-in user to their personal realtime room and refreshes
 * the notifications feed + unread count when a `notification.created` event
 * arrives. Mirrors `useOrderTracking`. No-op (and silent) when logged out.
 */
export function useNotificationRealtime(userId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const client = getRealtimeClient();
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        await client.connect();
        await client.subscribe(ROOMS.user(userId));
        if (!mounted) return;
        unsubscribe = client.on('notification.created', () => {
          qc.invalidateQueries({ queryKey: ['notifications'] });
        });
      } catch {
        // Socket unavailable / unauthenticated — the feed still works via fetch.
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
      client.unsubscribe(ROOMS.user(userId)).catch(() => {});
    };
  }, [userId, qc]);
}
