import type {
  KitchenTicketEvent,
  OrderCancelledEvent,
  OrderCreatedEvent,
  OrderRefundedEvent,
  OrderStatusChangedEvent,
  RealtimeEventName,
  SubscribeAck,
} from '@repo/types';
import { type Socket, io } from 'socket.io-client';

export type RealtimeEventMap = {
  'order.created': OrderCreatedEvent;
  'order.status_changed': OrderStatusChangedEvent;
  'order.cancelled': OrderCancelledEvent;
  'order.refunded': OrderRefundedEvent;
  'kitchen.ticket_added': KitchenTicketEvent;
  'kitchen.ticket_removed': KitchenTicketEvent;
};

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface CreateRealtimeClientOptions {
  url: string;
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface RealtimeClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (room: string) => Promise<SubscribeAck>;
  unsubscribe: (room: string) => Promise<SubscribeAck>;
  on<E extends RealtimeEventName>(
    event: E,
    handler: (payload: RealtimeEventMap[E]) => void,
  ): () => void;
  status: () => ConnectionStatus;
}

export function createRealtimeClient(opts: CreateRealtimeClientOptions): RealtimeClient {
  let socket: Socket | null = null;
  let status: ConnectionStatus = 'idle';

  function setStatus(next: ConnectionStatus): void {
    status = next;
    opts.onStatusChange?.(next);
  }

  async function connect(): Promise<void> {
    if (socket?.connected) return;
    setStatus('connecting');
    const token = await opts.getAccessToken();
    socket = io(opts.url, {
      auth: { token: token ?? '' },
      autoConnect: false,
      reconnection: true,
      transports: ['websocket'],
    });
    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.connect();
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
    setStatus('idle');
  }

  function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
    if (!socket) {
      return Promise.reject(new Error('Realtime client not connected'));
    }
    return new Promise((resolve, reject) => {
      socket?.timeout(5_000).emit(event, payload, (err: Error | null, ack: T) => {
        if (err) reject(err);
        else resolve(ack);
      });
    });
  }

  return {
    connect,
    disconnect,
    subscribe: (room) => emitWithAck<SubscribeAck>('subscribe', { room }),
    unsubscribe: (room) => emitWithAck<SubscribeAck>('unsubscribe', { room }),
    on(event, handler) {
      if (!socket) {
        return () => {};
      }
      const wrapped = ((payload: unknown) =>
        handler(payload as RealtimeEventMap[typeof event])) as (...args: unknown[]) => void;
      socket.on(event as string, wrapped);
      return () => {
        socket?.off(event as string, wrapped);
      };
    },
    status: () => status,
  };
}

export { ROOMS } from '@repo/types';
