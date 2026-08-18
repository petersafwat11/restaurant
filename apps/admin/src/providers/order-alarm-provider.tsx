'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { getRealtimeClient } from '@/lib/realtime-client';
import { useAuthStore } from '@/stores/auth-store';
import type { OrderCreatedEvent, OrderListItemDto, OrderStatusChangedEvent } from '@repo/types';
import { ROOMS } from '@repo/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAdvanceOrder } from '../features/orders/hooks/use-advance-order';
import { orderAlarmAudio } from '../features/orders/lib/web-audio-alarm';
import { orderQueryKeys } from '../features/orders/query-keys';

const MUTE_STORAGE_KEY = 'admin.sound.muted';
const SNOOZE_STORAGE_KEY = 'admin.order_alarm.snoozed';

export interface SnoozeRecord {
  orderId: string;
  orderNumber: string;
  snoozedAt: number;
  reAlarmAt: number;
  minutesPending: number;
}

export interface OrderAlarmContextValue {
  /** List of all currently active pending orders requiring staff action */
  pendingOrders: OrderListItemDto[];
  /** List of pending orders that are currently NOT snoozed (actively ringing) */
  activeRingingOrders: OrderListItemDto[];
  /** Map of orderId -> SnoozeRecord for snoozed orders */
  snoozedOrders: Record<string, SnoozeRecord>;
  /** Whether the audio alarm is currently muted by user preference */
  isMuted: boolean;
  /** Whether the audio alarm is actively ringing right now */
  isRinging: boolean;
  /** Whether browser autoplay policy is blocking sound until user interaction */
  isAudioBlocked: boolean;
  /** Set sound mute state */
  setMuted: (muted: boolean) => void;
  /** Snooze an order's alarm for N minutes (default 5 min) */
  snoozeOrder: (orderId: string, minutes?: number) => void;
  /** Snooze all currently ringing orders for N minutes (default 5 min) */
  snoozeAll: (minutes?: number) => void;
  /** Immediately confirm a pending order */
  confirmOrder: (order: OrderListItemDto) => Promise<void>;
  /** Unlock Web Audio context if blocked by browser */
  unlockAudio: () => Promise<void>;
}

const OrderAlarmContext = createContext<OrderAlarmContextValue | null>(null);

function readStorageMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStorageMuted(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  } catch {}
}

function readStorageSnoozed(): Record<string, SnoozeRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const current = Date.now();
    const valid: Record<string, SnoozeRecord> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, SnoozeRecord>)) {
      if (v && typeof v === 'object' && v.reAlarmAt > current) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function writeStorageSnoozed(value: Record<string, SnoozeRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

export function OrderAlarmProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadOrders = Boolean(
    user && (typeof hasPermission === 'function' ? hasPermission('order:read') : true),
  );
  const qc = useQueryClient();
  const advanceMutation = useAdvanceOrder();

  const [isMuted, setIsMutedState] = useState<boolean>(readStorageMuted);
  const [snoozedOrders, setSnoozedOrders] =
    useState<Record<string, SnoozeRecord>>(readStorageSnoozed);
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  const setMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    writeStorageMuted(muted);
    if (muted) {
      orderAlarmAudio.stop();
    }
  }, []);

  // Sync mute and snooze states across multi-tab browser sessions
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUTE_STORAGE_KEY) {
        setIsMutedState(e.newValue === 'true');
      } else if (e.key === SNOOZE_STORAGE_KEY) {
        setSnoozedOrders(readStorageSnoozed());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Poll pending orders every 30 seconds as fallback to realtime socket
  const { data: pendingData } = useQuery({
    queryKey: ['orders', 'pending-alarm-list'],
    queryFn: async () => {
      if (!canReadOrders) return { items: [], total: 0 };
      return getApiClient().orders.list({ status: 'PENDING', limit: 50 });
    },
    enabled: canReadOrders,
    refetchInterval: 25_000,
  });

  const [pendingOrders, setPendingOrders] = useState<OrderListItemDto[]>([]);

  // Sync query data with pending state
  useEffect(() => {
    if (pendingData?.items) {
      setPendingOrders(pendingData.items);
    }
  }, [pendingData]);

  // Listen to realtime socket events for instantaneous order creation / status changes
  useEffect(() => {
    if (!canReadOrders) return;
    const client = getRealtimeClient();
    let unsubCreated: (() => void) | undefined;
    let unsubStatus: (() => void) | undefined;
    let mounted = true;

    (async () => {
      await client.connect();
      await client.subscribe(ROOMS.orders);
      if (!mounted) return;

      unsubCreated = client.on('order.created', (event: OrderCreatedEvent) => {
        if (event.status === 'PENDING') {
          const newItem: OrderListItemDto = {
            id: event.orderId,
            orderNumber: event.orderNumber,
            status: event.status,
            type: event.type,
            grandTotal: event.grandTotal,
            currency: event.currency,
            itemCount: event.itemCount,
            customerName: event.customerName,
            createdAt: event.createdAt,
          };
          setPendingOrders((prev) => {
            if (prev.some((o) => o.id === event.orderId)) return prev;
            return [newItem, ...prev];
          });
        }
      });

      unsubStatus = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
        if (event.to !== 'PENDING') {
          // Order left PENDING state -> remove from pending and snoozed
          setPendingOrders((prev) => prev.filter((o) => o.id !== event.orderId));
          setSnoozedOrders((prev) => {
            if (!prev[event.orderId]) return prev;
            const next = { ...prev };
            delete next[event.orderId];
            writeStorageSnoozed(next);
            return next;
          });
        } else {
          // If status transitioned back to PENDING (rare)
          setPendingOrders((prev) => {
            if (prev.some((o) => o.id === event.orderId)) return prev;
            return [
              {
                id: event.orderId,
                orderNumber: event.orderNumber,
                status: event.to,
                type: event.type,
                grandTotal: event.grandTotal,
                currency: event.currency,
                itemCount: event.itemCount,
                customerName: event.customerName,
                createdAt: event.changedAt,
              },
              ...prev,
            ];
          });
        }
      });
    })();

    return () => {
      mounted = false;
      unsubCreated?.();
      unsubStatus?.();
    };
  }, [canReadOrders]);

  // Clock tick every second to check snooze expiration and re-alarm
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);

      // Check if any snoozed order reached its reAlarmAt timestamp
      setSnoozedOrders((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, record] of Object.entries(prev)) {
          if (current >= record.reAlarmAt) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter pending orders to only include active orders placed within the last 4 hours
  // to avoid ringing alarms for old abandoned/unpaid historical orders
  const activePendingOrders = useMemo(() => {
    const cutoff = now - 4 * 60 * 60 * 1000;
    return pendingOrders.filter((order) => {
      const createdTime = new Date(order.createdAt).getTime();
      return Number.isFinite(createdTime) && createdTime >= cutoff;
    });
  }, [pendingOrders, now]);

  // Compute active ringing orders: recent pending orders whose ID is NOT in snoozedOrders
  const activeRingingOrders = useMemo(() => {
    return activePendingOrders.filter((order) => !snoozedOrders[order.id]);
  }, [activePendingOrders, snoozedOrders]);

  const shouldRing = activeRingingOrders.length > 0 && !isMuted;

  // Handle continuous Web Audio Alarm
  useEffect(() => {
    if (shouldRing) {
      orderAlarmAudio.start();
      // Check if autoplay is blocked
      if (!orderAlarmAudio.isUnlocked()) {
        setIsAudioBlocked(true);
      } else {
        setIsAudioBlocked(false);
      }
    } else {
      orderAlarmAudio.stop();
    }

    return () => {
      orderAlarmAudio.stop();
    };
  }, [shouldRing]);

  // Attempt audio unlock on first user interaction anywhere in the window
  useEffect(() => {
    const onUserGesture = () => {
      orderAlarmAudio.unlock().then((unlocked) => {
        if (unlocked) {
          setIsAudioBlocked(false);
        }
      });
    };

    window.addEventListener('click', onUserGesture, { capture: true });
    window.addEventListener('keydown', onUserGesture, { capture: true });
    window.addEventListener('touchstart', onUserGesture, { capture: true });

    return () => {
      window.removeEventListener('click', onUserGesture, { capture: true });
      window.removeEventListener('keydown', onUserGesture, { capture: true });
      window.removeEventListener('touchstart', onUserGesture, { capture: true });
    };
  }, []);

  const unlockAudio = useCallback(async () => {
    const unlocked = await orderAlarmAudio.unlock();
    if (unlocked) {
      setIsAudioBlocked(false);
      if (shouldRing) {
        orderAlarmAudio.start();
      }
    }
  }, [shouldRing]);

  const snoozeOrder = useCallback(
    (orderId: string, minutes = 5) => {
      const target = pendingOrders.find((o) => o.id === orderId);
      const orderNumber = target?.orderNumber ?? orderId;
      const createdAtMs = target ? new Date(target.createdAt).getTime() : Date.now();
      const minutesPending = Math.max(1, Math.round((Date.now() - createdAtMs) / 60_000));

      setSnoozedOrders((prev) => {
        const next = {
          ...prev,
          [orderId]: {
            orderId,
            orderNumber,
            snoozedAt: Date.now(),
            reAlarmAt: Date.now() + minutes * 60_000,
            minutesPending,
          },
        };
        writeStorageSnoozed(next);
        return next;
      });

      notify('info', `Order #${orderNumber} snoozed for ${minutes} min`);
    },
    [pendingOrders],
  );

  const snoozeAll = useCallback(
    (minutes = 5) => {
      const current = Date.now();
      const newSnoozes: Record<string, SnoozeRecord> = {};
      for (const order of activeRingingOrders) {
        const createdAtMs = new Date(order.createdAt).getTime();
        const minutesPending = Math.max(1, Math.round((current - createdAtMs) / 60_000));
        newSnoozes[order.id] = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          snoozedAt: current,
          reAlarmAt: current + minutes * 60_000,
          minutesPending,
        };
      }
      setSnoozedOrders((prev) => {
        const next = { ...prev, ...newSnoozes };
        writeStorageSnoozed(next);
        return next;
      });
      orderAlarmAudio.stop();
      notify('info', `All pending orders snoozed for ${minutes} min`);
    },
    [activeRingingOrders],
  );

  const confirmOrder = useCallback(
    async (order: OrderListItemDto) => {
      try {
        await advanceMutation.mutateAsync({
          orderId: order.id,
          currentStatus: 'PENDING',
          type: order.type,
          to: 'CONFIRMED',
        });
        // Remove immediately from state
        setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
        setSnoozedOrders((prev) => {
          if (!prev[order.id]) return prev;
          const next = { ...prev };
          delete next[order.id];
          writeStorageSnoozed(next);
          return next;
        });
      } catch {
        // Error handled by advanceMutation onError
      }
    },
    [advanceMutation],
  );

  const value = useMemo<OrderAlarmContextValue>(
    () => ({
      pendingOrders: activePendingOrders,
      activeRingingOrders,
      snoozedOrders,
      isMuted,
      isRinging: shouldRing,
      isAudioBlocked,
      setMuted,
      snoozeOrder,
      snoozeAll,
      confirmOrder,
      unlockAudio,
    }),
    [
      activePendingOrders,
      activeRingingOrders,
      snoozedOrders,
      isMuted,
      shouldRing,
      isAudioBlocked,
      setMuted,
      snoozeOrder,
      snoozeAll,
      confirmOrder,
      unlockAudio,
    ],
  );

  return <OrderAlarmContext.Provider value={value}>{children}</OrderAlarmContext.Provider>;
}

const DEFAULT_ALARM_VALUE: OrderAlarmContextValue = {
  pendingOrders: [],
  activeRingingOrders: [],
  snoozedOrders: {},
  isMuted: false,
  isRinging: false,
  isAudioBlocked: false,
  setMuted: () => undefined,
  snoozeOrder: () => undefined,
  snoozeAll: () => undefined,
  confirmOrder: async () => undefined,
  unlockAudio: async () => undefined,
};

export function useOrderAlarm(): OrderAlarmContextValue {
  const ctx = useContext(OrderAlarmContext);
  return ctx ?? DEFAULT_ALARM_VALUE;
}
