'use client';

import { getRealtimeClient } from '@/lib/realtime-client';
import type { OrderDto, OrderStatusChangedEvent } from '@repo/types';
import { ROOMS } from '@repo/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { orderQueryKeys } from '../query-keys';
import { useOrder } from './use-order';

/**
 * Subscribes to `order:{orderId}` and patches the TanStack Query cache when
 * a status_changed event arrives. Returns the live order via `useOrder`.
 */
export function useOrderTracking(orderId: string, token?: string | null) {
  const qc = useQueryClient();
  const query = useOrder(orderId, token);

  useEffect(() => {
    if (!orderId) return;
    const client = getRealtimeClient();
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        await client.connect();
        await client.subscribe(ROOMS.order(orderId), token);
        if (!mounted) return;
        unsubscribe = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
          if (event.orderId !== orderId) return;
          qc.setQueryData<OrderDto>(orderQueryKeys.detail(orderId), (prev) =>
            prev ? { ...prev, status: event.to } : prev,
          );
          playStatusChime();
        });
      } catch {
        // Guest orders + auth-less sessions can't authenticate the socket; the
        // confirmation page still works via the cached order. Swallow so the
        // rejection doesn't surface as an unhandled error.
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
      // Don't disconnect the singleton — other consumers may still need it.
      client.unsubscribe(ROOMS.order(orderId), token).catch(() => {});
    };
  }, [orderId, qc, token]);

  return query;
}

function playStatusChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two pleasant upward tones: C5 (523Hz) -> G5 (784Hz)
    [
      { freq: 523.25, time: now },
      { freq: 783.99, time: now + 0.15 },
    ].forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.38);
    });
  } catch {
    // Autoplay or browser restriction — ignore gracefully
  }
}
