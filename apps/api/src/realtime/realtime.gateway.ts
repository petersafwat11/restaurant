import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verifyAccessToken } from '@repo/auth-core';
import type {
  AuthAudience,
  KitchenTicketEvent,
  OrderCancelledEvent,
  OrderCreatedEvent,
  OrderRefundedEvent,
  OrderStatusChangedEvent,
  SubscribeAck,
} from '@repo/types';
import { ROOMS, SubscribeMessageSchema } from '@repo/types';
import fastifyCookie from '@fastify/cookie';
import type { Server, Socket } from 'socket.io';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

interface SocketUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  /** JWT exp (seconds). Sockets are long-lived; re-checked on subscribe. */
  exp?: number;
}

interface AuthedSocket extends Socket {
  data: { user?: SocketUser };
}

// CORS for the Socket.IO server. Cookies on the handshake require credentials,
// and browsers refuse credentials with `origin: '*'` — so the allowed origins
// must mirror the HTTP CORS list. Resolved lazily so env is available.
function gatewayCorsOptions(): { origin: string[]; credentials: boolean } {
  // biome-ignore lint/style/noProcessEnv: gateway decorator is evaluated at module load
  const web = process.env.APP_URL_WEB || 'http://localhost:3000';
  // biome-ignore lint/style/noProcessEnv: gateway decorator is evaluated at module load
  const admin = process.env.APP_URL_ADMIN || 'http://localhost:3001';
  return { origin: [web, admin], credentials: true };
}

@WebSocketGateway({
  cors: gatewayCorsOptions(),
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    @Inject(ENV) private readonly env: ENV_TYPE,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Connection lifecycle ---------------------------------------------

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const claims = verifyAccessToken(token, {
        accessSecret: this.env.JWT_ACCESS_SECRET,
        refreshSecret: this.env.JWT_REFRESH_SECRET,
        accessTtl: this.env.JWT_ACCESS_TTL,
        refreshTtl: this.env.JWT_REFRESH_TTL,
      });
      client.data.user = {
        id: claims.sub,
        email: claims.email,
        roles: claims.roles,
        permissions: claims.permissions,
        exp: (claims as unknown as { exp?: number }).exp,
      };
      this.logger.log(`Socket ${client.id} connected as ${claims.email}`);
    } catch (err) {
      // Bad/expired token. We can't set a custom WS close code from a
      // server-side disconnect; log so an auth/secret regression isn't silent
      // (it would otherwise look like every client just dropping).
      this.logger.debug(`Socket ${client.id} auth rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  // ---- Subscribe -------------------------------------------------------

  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    const parsed = SubscribeMessageSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, reason: 'Invalid subscribe payload' };
    }
    const user = client.data.user;
    if (!user) return { ok: false, reason: 'Unauthenticated' };

    // Sockets outlive the 15-min access token. Re-check expiry here so a
    // demoted/revoked user can't keep subscribing to sensitive feeds on a
    // long-lived connection using stale claims.
    if (user.exp && Date.now() >= user.exp * 1000) {
      client.disconnect(true);
      return { ok: false, reason: 'Token expired — reconnect' };
    }

    const allowed = await this.canJoin(user, parsed.data.room);
    if (!allowed.ok) return allowed;

    await client.join(parsed.data.room);
    return { ok: true, room: parsed.data.room };
  }

  @SubscribeMessage('unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    const parsed = SubscribeMessageSchema.safeParse(body);
    if (!parsed.success) return { ok: false, reason: 'Invalid unsubscribe payload' };
    await client.leave(parsed.data.room);
    return { ok: true, room: parsed.data.room };
  }

  // ---- Event handlers (bridge from EventEmitter2 → socket.io) ----------

  @OnEvent('order.created')
  onOrderCreated(event: OrderCreatedEvent): void {
    this.server?.to(ROOMS.orders).emit('order.created', event);
  }

  @OnEvent('order.status_changed')
  onOrderStatusChanged(event: OrderStatusChangedEvent): void {
    this.server?.to(ROOMS.order(event.orderId)).emit('order.status_changed', event);
    this.server?.to(ROOMS.orders).emit('order.status_changed', event);
  }

  @OnEvent('order.cancelled')
  onOrderCancelled(event: OrderCancelledEvent): void {
    this.server?.to(ROOMS.order(event.orderId)).emit('order.cancelled', event);
    this.server?.to(ROOMS.orders).emit('order.cancelled', event);
  }

  @OnEvent('order.refunded')
  onOrderRefunded(event: OrderRefundedEvent): void {
    this.server?.to(ROOMS.order(event.orderId)).emit('order.refunded', event);
    this.server?.to(ROOMS.orders).emit('order.refunded', event);
  }

  @OnEvent('kitchen.ticket_added')
  onKitchenTicketAdded(event: OrderStatusChangedEvent): void {
    const ticket: KitchenTicketEvent = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      type: event.type,
      status: event.to,
      itemCount: event.itemCount,
    };
    this.server?.to(ROOMS.kitchen).emit('kitchen.ticket_added', ticket);
  }

  @OnEvent('kitchen.ticket_removed')
  onKitchenTicketRemoved(event: OrderStatusChangedEvent): void {
    const ticket: KitchenTicketEvent = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      type: event.type,
      status: event.to,
      itemCount: event.itemCount,
    };
    this.server?.to(ROOMS.kitchen).emit('kitchen.ticket_removed', ticket);
  }

  // ---- Permission checks ----------------------------------------------

  private async canJoin(user: SocketUser, room: string): Promise<SubscribeAck> {
    const orderMatch = /^order:(.+)$/.exec(room);
    if (orderMatch) {
      const orderId = orderMatch[1];
      if (!orderId) return { ok: false, reason: 'Invalid order room' };
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      if (!order) return { ok: false, reason: 'Order not found' };
      const isOwner = order.userId === user.id;
      const canRead = user.permissions.includes('order:read');
      if (!isOwner && !canRead) return { ok: false, reason: 'Forbidden' };
      return { ok: true, room };
    }

    if (room === ROOMS.orders) {
      if (!user.permissions.includes('order:read')) {
        return { ok: false, reason: 'Forbidden' };
      }
      return { ok: true, room };
    }

    if (room === ROOMS.kitchen) {
      if (!user.permissions.includes('kitchen:read')) {
        return { ok: false, reason: 'Forbidden' };
      }
      return { ok: true, room };
    }

    return { ok: false, reason: 'Unknown room' };
  }

  private extractToken(client: Socket): string | null {
    // Mobile / header path.
    const headerToken = (client.handshake.headers.authorization ?? '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    const authToken = (client.handshake.auth?.token as string | undefined) ?? '';
    if (authToken) return authToken;
    if (headerToken) return headerToken;

    // Cookie path — read audience from the handshake query, then the matching
    // cookie. Web/admin clients send `?audience=web|admin` plus the browser's
    // cookies on the upgrade.
    const audienceRaw = client.handshake.query?.audience;
    const audience = (Array.isArray(audienceRaw) ? audienceRaw[0] : audienceRaw) as
      | AuthAudience
      | undefined;
    if (audience !== 'web' && audience !== 'admin') return null;

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = fastifyCookie.parse(cookieHeader);
    return cookies[`${audience}_at`] || null;
  }
}
