import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { type Socket, io } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ROOMS } from '@repo/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, ensureOwnerToken, resetDb, resetMenuDb } from './setup-e2e';

const SOCKET_PATH = '/socket.io/';
const SUBSCRIBE_TIMEOUT_MS = 3_000;
const EVENT_TIMEOUT_MS = 3_000;

describe('realtime (e2e)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let ownerToken: string;
  let customerToken: string;
  let restaurantId: string;
  let orderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    app.useWebSocketAdapter(new IoAdapter(app));
    // Listen on a random free port so we can connect a real Socket.IO client.
    await app.listen(0, '127.0.0.1');
    const server = (
      app.getHttpServer() as unknown as { address: () => { port: number } | string | null }
    ).address();
    const port = typeof server === 'object' && server ? server.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetMenuDb(app);
    await resetDb(app);
    ownerToken = await ensureOwnerToken(app, 'rt.owner.e2e@test.local');
    customerToken = await register('rt.customer.e2e@test.local');

    const r = await inject(
      'POST',
      '/api/v1/restaurants',
      {
        slug: 'rt-e2e',
        name: 'Realtime E2E',
        phone: '+48 22 555 0001',
        email: 'rt@e2e.local',
        address: { line1: 'ul. 1', city: 'Warsaw', country: 'PL' },
      },
      ownerToken,
    );
    restaurantId = r.json().id;

    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      { restaurantId, slug: 'mains', name: 'Mains' },
      ownerToken,
    );
    const item = await inject(
      'POST',
      '/api/v1/menu/items',
      {
        categoryId: cat.json().id,
        slug: 'burger',
        name: 'Burger',
        basePrice: '38.00',
      },
      ownerToken,
    );
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: item.json().id, quantity: 1, modifierSelections: [] },
      customerToken,
    );
    const order = await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      customerToken,
      { 'idempotency-key': `rt-${Date.now()}` },
    );
    orderId = order.json().id;

    // Confirm order so kitchen rooms have something to act on.
    const prisma = app.get(PrismaService);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });
  });

  async function inject(
    method: string,
    url: string,
    body?: unknown,
    token?: string,
    extraHeaders: Record<string, string> = {},
  ) {
    return app.inject({
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url,
      payload: body as never,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
    });
  }

  async function register(email: string): Promise<string> {
    const res = await inject('POST', '/api/v1/auth/register', {
      email,
      password: 'Password123!',
    });
    return res.json().accessToken;
  }

  function connect(token?: string): Socket {
    return io(baseUrl, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      reconnection: false,
      auth: token ? { token } : {},
      forceNew: true,
    });
  }

  function waitForConnect(socket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error('connect timeout'));
      }, EVENT_TIMEOUT_MS);
      socket.on('connect', () => {
        clearTimeout(t);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });
  }

  function waitForDisconnect(socket: Socket): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(), EVENT_TIMEOUT_MS);
      socket.on('disconnect', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  function subscribe(
    socket: Socket,
    room: string,
  ): Promise<{ ok: boolean; reason?: string; room?: string }> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('subscribe timeout')), SUBSCRIBE_TIMEOUT_MS);
      socket.emit('subscribe', { room }, (ack: { ok: boolean; reason?: string; room?: string }) => {
        clearTimeout(t);
        resolve(ack);
      });
    });
  }

  function waitForEvent<T>(socket: Socket, name: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`event ${name} timeout`)), EVENT_TIMEOUT_MS);
      socket.once(name, (payload: T) => {
        clearTimeout(t);
        resolve(payload);
      });
    });
  }

  // ---- Scenarios -----------------------------------------------------------

  it('rejects unauthenticated socket connections', async () => {
    const socket = connect(); // no token
    await waitForDisconnect(socket);
    expect(socket.connected).toBe(false);
    socket.close();
  });

  it('lets an order owner subscribe to their order room', async () => {
    const socket = connect(customerToken);
    await waitForConnect(socket);
    const ack = await subscribe(socket, ROOMS.order(orderId));
    expect(ack.ok).toBe(true);
    socket.close();
  });

  it("rejects subscription to another user's order room", async () => {
    const otherToken = await register('rt.other.e2e@test.local');
    const socket = connect(otherToken);
    await waitForConnect(socket);
    const ack = await subscribe(socket, ROOMS.order(orderId));
    expect(ack.ok).toBe(false);
    socket.close();
  });

  it('delivers order.status_changed to the order-room subscriber when admin transitions', async () => {
    const socket = connect(customerToken);
    await waitForConnect(socket);
    const ack = await subscribe(socket, ROOMS.order(orderId));
    expect(ack.ok).toBe(true);

    const eventP = waitForEvent<{ to: string; orderId: string }>(socket, 'order.status_changed');

    const res = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'PREPARING' },
      ownerToken,
    );
    expect(res.statusCode).toBe(201);

    const event = await eventP;
    expect(event.orderId).toBe(orderId);
    expect(event.to).toBe('PREPARING');
    socket.close();
  });

  it("delivers order.created on the restaurant orders room", async () => {
    const socket = connect(ownerToken);
    await waitForConnect(socket);
    const ack = await subscribe(socket, ROOMS.restaurantOrders(restaurantId));
    expect(ack.ok).toBe(true);

    const eventP = waitForEvent<{ orderId: string; type: string }>(socket, 'order.created');

    // Place a second order to trigger order.created.
    const cat = await inject(
      'POST',
      '/api/v1/menu/categories',
      { restaurantId, slug: 'sides', name: 'Sides' },
      ownerToken,
    );
    const fries = await inject(
      'POST',
      '/api/v1/menu/items',
      { categoryId: cat.json().id, slug: 'fries', name: 'Fries', basePrice: '12.00' },
      ownerToken,
    );
    const customer2 = await register('rt.customer2.e2e@test.local');
    await inject(
      'POST',
      `/api/v1/cart/items?restaurantId=${restaurantId}`,
      { menuItemId: fries.json().id, quantity: 1, modifierSelections: [] },
      customer2,
    );
    await inject(
      'POST',
      '/api/v1/orders',
      { restaurantId, type: 'PICKUP', tipAmount: '0' },
      customer2,
      { 'idempotency-key': `rt-evt-${Date.now()}` },
    );

    const event = await eventP;
    expect(event.orderId).toBeTypeOf('string');
    expect(['PICKUP', 'DELIVERY', 'DINE_IN']).toContain(event.type);
    socket.close();
  });

  it('delivers kitchen.ticket_added when a CONFIRMED order moves to PREPARING', async () => {
    const socket = connect(ownerToken);
    await waitForConnect(socket);
    const ack = await subscribe(socket, ROOMS.restaurantKitchen(restaurantId));
    expect(ack.ok).toBe(true);

    const eventP = waitForEvent<{ orderId: string; status: string }>(socket, 'kitchen.ticket_added');

    const res = await inject(
      'POST',
      `/api/v1/orders/${orderId}/status`,
      { to: 'PREPARING' },
      ownerToken,
    );
    expect(res.statusCode).toBe(201);

    const event = await eventP;
    expect(event.orderId).toBe(orderId);
    expect(event.status).toBe('PREPARING');
    socket.close();
  });
});
